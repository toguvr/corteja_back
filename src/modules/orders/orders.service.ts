import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import * as pagarme from '@pagarme/sdk';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    barbershopId,
    customerId,
    cartIds,
    document,
    phone,
    installments,
    isPix,
    card,
  }: CreateOrderDto) {
    if (cartIds && cartIds.length === 0) {
      throw new BadRequestException('Nenhum produto selecionado');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new BadRequestException('Usuário não encontrado');
    }
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
    });
    if (!barbershop) {
      throw new BadRequestException('Barbearia não encontrada');
    }
    if (!customer.phone || !customer.document) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          document: customer?.document || document,
          phone: customer?.phone || phone,
        },
      });
    }
    const privateKey = process.env.PAGARME_API;
    pagarme.Configuration.basicAuthUserName = privateKey;

    if (!phone) {
      throw new BadRequestException('Telefone não informado');
    }
    // Extrai o DDD (área) e o número
    const areaCode = phone.slice(0, 2); // Primeiro os dois dígitos
    const number = phone.slice(2); // O restante do número

    // Converte para o formato desejado
    const phones = {
      mobile_phone: {
        country_code: '55', // Código do Brasil
        area_code: areaCode,
        number,
      },
    };
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: cartIds },
      },
    });

    const totalInstallments = Number(installments) || 1;

    const amount = Math.round(
      services.reduce((acc, service) => acc + Number(service.amount), 0),
    );

    const fee = Math.round(amount * (Number(barbershop.fee) / 100));

    const totalAmount = Math.round(amount + fee);

    const order = await this.prisma.order.create({
      data: {
        amount,
        fee,
        total: totalAmount,
        barbershopId,
        customerId,
        servicesIds: cartIds.join('/;/'),
        status: 'PENDING',
        installments: totalInstallments,
        paymentMethod: isPix ? 'pix' : 'credit-card',
      },
    });
    const customerToPagarme = {
      external_id: customer?.id,
      name: customer.name,
      type: 'individual',
      email: customer?.email,
      document: document || customer?.document,
      phones,
    };

    const split = [
      {
        amount: fee,
        recipient_id: process.env.PAGARME_RECEIVER_ID,
        type: 'flat',
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: true,
          liable: true,
        },
      },
      {
        amount,
        type: 'flat',
        recipient_id: barbershop?.receiverId,
        options: {
          charge_processing_fee: false,
          charge_remainder_fee: false,
          liable: false,
        },
      },
    ];
    const items = [
      {
        id: '1',
        description: 'HoraCerta',
        amount: totalAmount,
        quantity: 1,
        code: order?.id,
      },
    ];
    let result;
    const metadata = {
      customerId,
      orderId: order.id,
      barbershopId: barbershopId,
      cartIds: JSON.stringify(cartIds),
    };
    if (isPix) {
      const orderRequest = new pagarme.CreateOrderRequest({
        metadata,
        customer_id: customer.customerChargeGatewayId,
        items,
        payments: [
          {
            payment_method: 'pix',
            pix: {
              expires_in: '7200', // Tempo em segundos
              additional_information: [
                {
                  name: 'HoraCerta',
                  value: totalAmount,
                },
              ],
            },
            split,
          },
        ],
      });

      const ordersController = pagarme.OrdersController;

      const ordersResponse = await ordersController.createOrder(orderRequest);

      const charge = ordersResponse.charges[0];

      const { lastTransaction } = charge;

      const erros = lastTransaction?.gatewayResponse?.errors;

      if (erros) {
        if (erros.length > 0) {
          // Extrair mensagens de erro
          const mensagensErro = erros
            .map((erro: any) => erro.message)
            .join(', ');

          // Lançar um erro com as mensagens concatenadas
          throw new BadRequestException(`Pagamento falhou: ${mensagensErro}`);
        } else {
          // Caso não tenha erros detalhados, lançar um erro genérico
          throw new BadRequestException('Pagamento falhou.');
        }
      }

      result = {
        pix: {
          qrCode: lastTransaction.qrCode,
          qrCodeUrl: lastTransaction.qrCodeUrl,
        },
        chargeId: charge.id,
      };
    } else {
      const statementDescriptor = 'HoraCerta';

      const ordersController = pagarme.OrdersController;

      // logger.debug(orderRequest);
      try {
        const ordersResponse = await ordersController.createOrder({
          metadata,
          customer: customerToPagarme,
          items,
          payments: [
            {
              payment_method: 'credit_card',
              credit_card: {
                installments: totalInstallments,
                capture: true,
                statement_descriptor: statementDescriptor.substring(0, 13),
                card,
              },
              split,
            },
          ],
        });

        const charge = ordersResponse?.charges[0];
        if (charge?.status !== 'paid') {
          const erros = charge?.lastTransaction?.gatewayResponse?.errors;
          if (erros && erros.length > 0) {
            // Extrair mensagens de erro
            const mensagensErro = erros
              .map((erro: any) => erro.message)
              .join(', ');

            // Lançar um erro com as mensagens concatenadas
            throw new BadRequestException(`Pagamento falhou: ${mensagensErro}`);
          } else {
            // Caso não tenha erros detalhados, lançar um erro genérico
            throw new BadRequestException('Pagamento falhou.');
          }
        }

        result = {
          chargeId: charge?.id,
        };
      } catch (error) {
        const errors = error?.errorResponse?.errors;

        // Mapeia os erros em uma lista de mensagens amigáveis
        const errorMessages = Object.entries(errors).map(
          ([field, messages]: [string, string[]]) => {
            return `${field}: ${messages.join(', ')}`;
          },
        );

        throw new BadRequestException(errorMessages);
      }
    }

    return {
      ...order,
      result,
    };
  }

  async findAll() {
    return await this.prisma.order.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.order.findFirst({
      where: { id },
      include: { payments: true },
    });
  }

  async update(id: string, updateOrderDto: Prisma.OrderUpdateInput) {
    return await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.order.delete({ where: { id } });
  }
}
