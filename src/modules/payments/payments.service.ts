import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPaymentDto) {
    const payment_method = createPaymentDto?.data?.payment_method;
    const total = createPaymentDto?.data?.amount;
    const barbershopId = createPaymentDto?.data?.metadata?.barbershopId;
    const customerId = createPaymentDto?.data?.metadata?.customerId;
    const orderId = createPaymentDto?.data?.metadata?.orderId;

    const amount = createPaymentDto?.data?.last_transaction?.amount;
    // payment_method === 'credit_card'
    //   ? createPaymentDto?.data?.last_transaction?.split[1]?.amount
    //   : createPaymentDto?.data?.last_transaction?.splits[1]?.amount;

    const fee = createPaymentDto?.data?.last_transaction?.amount;
    // payment_method === 'credit_card'
    //   ? createPaymentDto?.data?.last_transaction?.split[0]?.amount
    //   : createPaymentDto?.data?.last_transaction?.splits[0]?.amount;

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
        paymentDate: createPaymentDto?.data?.paid_at,
        orderId,
        amount,
        installments: Number(installments),
      },
    });
    await this.prisma.balance.create({
      data: {
        barbershopId,
        amount,
        customerId,
        paymentId: payment.id,
        paymentDate: createPaymentDto?.data?.paid_at,
        status: createPaymentDto?.data?.status,
        type: 'INCOME',
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
      },
    });
    return payment;
  }

  async findAll() {
    return await this.prisma.payment.findMany();
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
