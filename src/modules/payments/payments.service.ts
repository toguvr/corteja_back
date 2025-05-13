import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from '@/core/database/prisma.service';
import axios from 'axios';
import whatsApi from '@/core/services/whats';
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}
  calcularPartesPorPercentual(percentualY: number, total: number) {
    const y = +(total * (percentualY / 100));
    const x = +(total - y);
    return { x: Math.round(x), y: Math.round(y) };
  }
  async create(createPaymentDto) {
    const payment_method = createPaymentDto?.data?.payment_method;
    const total = createPaymentDto?.data?.amount;
    const whatsapp = createPaymentDto?.data?.metadata?.whatsapp;
    const barbershopId = createPaymentDto?.data?.metadata?.barbershopId;
    const customerId = createPaymentDto?.data?.metadata?.customerId;
    const orderId = createPaymentDto?.data?.metadata?.orderId;
    const subscriptionId = createPaymentDto?.data?.metadata?.subscriptionId;

    let amount = 0;
    let fee = 0;
    if (payment_method === 'credit_card') {
      // createPaymentDto?.data?.last_transaction?.amount

      if (
        createPaymentDto?.data?.last_transaction?.split[1]?.type ===
        'percentage'
      ) {
        if (subscriptionId) {
          const currentSubscription = await this.prisma.subscription.findFirst({
            where: { id: subscriptionId },
            include: {
              plan: true,
            },
          });
          amount = currentSubscription?.plan?.price || 0;
          fee = total - amount;
        } else {
          amount = this.calcularPartesPorPercentual(
            createPaymentDto?.data?.last_transaction?.split[1]?.amount,
            total,
          ).y;
          fee = this.calcularPartesPorPercentual(
            createPaymentDto?.data?.last_transaction?.split[0]?.amount,
            total,
          ).y;
        }
      } else {
        amount = createPaymentDto?.data?.last_transaction?.split[1]?.amount;
        fee = createPaymentDto?.data?.last_transaction?.split[0]?.amount;
      }
    } else {
      // createPaymentDto?.data?.last_transaction?.amount
      //nao pode ser percentage em pix.
      amount = createPaymentDto?.data?.last_transaction?.splits[1]?.amount;
      fee = createPaymentDto?.data?.last_transaction?.splits[0]?.amount;
    }

    const installments =
      createPaymentDto?.data?.last_transaction?.installments ?? '1';

    const payment = await this.prisma.payment.create({
      data: {
        barbershopId,
        customerId,
        fee,
        total,
        status: createPaymentDto?.data?.status,
        transactionId: createPaymentDto?.data?.last_transaction?.id,
        paymentMethod: payment_method,
        paymentDate: new Date(createPaymentDto?.data?.paid_at),
        orderId,
        amount,
        installments: Number(installments),
        type: subscriptionId ? 'Assinatura' : 'Avulso',
      },
    });
    await this.prisma.balance.create({
      data: {
        barbershopId,
        amount,
        customerId,
        paymentId: payment.id,
        paymentDate: new Date(createPaymentDto?.data?.paid_at),
        status: createPaymentDto?.data?.status,
        type: 'INCOME',
      },
    });
    if (orderId) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
        },
      });
    } else if (subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          active: true,
        },
      });
    }

    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId },
    });
    const minAmountToStamp = barbershop?.minAmountToStamp || 0;

    if (barbershop?.haveLoyalty && minAmountToStamp <= total) {
      await this.prisma.loyaltyStamp.create({
        data: {
          barbershopId,
          customerId,
          paymentId: payment.id,
        },
      });
    }
    if (whatsapp) {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

      const existChatByPhone = await this.prisma.chat.findFirst({
        where: {
          phone: whatsapp,
          finished: false,
          createdAt: {
            gte: twentyMinutesAgo,
          },
        },
        include: { barbershop: true, service: true },
      });
      if (
        existChatByPhone?.barbershopId &&
        existChatByPhone?.serviceId &&
        existChatByPhone?.time &&
        existChatByPhone?.date
      ) {
        const barbershopName = existChatByPhone?.barbershop?.name ?? '';
        const serviceName = existChatByPhone?.service?.name ?? '';
        const dateString = new Date(
          existChatByPhone?.date ?? '',
        ).toLocaleDateString('pt-BR');
        const time = existChatByPhone?.time ?? '';
        const weekDay = new Date(
          existChatByPhone?.date ?? '',
        ).toLocaleDateString('pt-BR', {
          weekday: 'long',
        });

        await whatsApi.post('/send-button-list', {
          phone: whatsapp,
          delayMessage: 5,
          message: `✅ Pagamento identificado!\n\nSeu saldo foi atualizado. Agora você pode confirmar o agendamento.\n\nDeseja confirmar o agendamento de *${serviceName}* em *${barbershopName}* para o dia *${dateString} (${weekDay})* às *${time}* ?`,
          buttonList: {
            buttons: [
              {
                id: 'confirmar',
                label: 'Sim',
              },
              {
                id: 'resetar',
                label: 'Não',
              },
            ],
          },
        });
      } else {
        await whatsApi.post('/send-button-list', {
          phone: whatsapp,
          delayMessage: 5,
          message: `✅ Pagamento identificado!\n\nSeu saldo foi atualizado. Agora você pode confirmar o agendamento.\n\nDeseja confirmar o agendamento?`,
          buttonList: {
            buttons: [
              {
                id: 'confirmar',
                label: 'Sim',
              },
              {
                id: 'resetar',
                label: 'Não',
              },
            ],
          },
        });
      }
    }
    return payment;
  }

  async findAll() {
    return await this.prisma.payment.findMany();
  }

  async findAllByCustomer(customerId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { customerId },
      include: {
        customer: true,
        service: true,
        barber: true,
        barbershop: true,
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments;
  }
  async findAllByBarbershop(barbershopId: string) {
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
    });
    if (!barbershop) {
      throw new BadRequestException('Empresa não encontrada.');
    }
    const response = await axios.get(
      `https://api.pagar.me/core/v5/recipients/${barbershop?.receiverId}/balance`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.PAGARME_API + ':',
          ).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }
  async findAllWithdrawalsByBarbershop(barbershopId: string, page = '1') {
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
    });
    if (!barbershop) {
      throw new BadRequestException('Empresa não encontrada.');
    }
    const response = await axios.get(
      `https://api.pagar.me/core/v5/recipients/${barbershop?.receiverId}/withdrawals?page=${page}&size=10`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.PAGARME_API + ':',
          ).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }
  async createWithdraw(barbershopId: string, amount: number) {
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
    });
    if (!barbershop) {
      throw new BadRequestException('Empresa não encontrada.');
    }
    const response = await axios.post(
      `https://api.pagar.me/core/v5/recipients/${barbershop?.receiverId}/withdrawals`,
      { amount },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.PAGARME_API + ':',
          ).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async findOne(id: string) {
    return await this.prisma.payment.findFirst({ where: { id } });
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    return await this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.payment.delete({ where: { id } });
  }
}
