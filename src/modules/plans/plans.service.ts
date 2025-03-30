import { ConflictException, Injectable } from '@nestjs/common';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';
import * as pagarme from '@pagarme/sdk';

const privateKey = process.env.PAGARME_API;
pagarme.Configuration.basicAuthUserName = privateKey;
@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ interval, serviceId, barbershopId }) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId as string },
    });
    if (!service) {
      throw new ConflictException('Serviço não encontrado.');
    }
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId as string },
    });
    if (!barbershop) {
      throw new ConflictException('Empresa não encontrado.');
    }
    const price = service?.amount || 0;
    const fee = price * (Number(barbershop?.fee) / 100);

    const totalAmount = price + fee;

    const planRequest = new pagarme.CreatePlanRequest({
      name: `Plano ${interval === 'week' ? 'semanal' : 'mensal'} Pix`,
      description: `Assinatura ${interval === 'week' ? 'semanal' : 'mensal'} paga com Pix`,
      interval: interval ? 'week' : 'month',
      interval_count: 1,
      billing_type: 'prepaid',
      pricing_scheme: {
        scheme_type: 'unit',
        price: totalAmount,
      },
      payment_methods: ['credit_card', 'debit_card'],
      shippable: false,
      quantity: 1,
    });

    const plano = await pagarme.PlansController.createPlan(planRequest);

    const response = await this.prisma.plan.create({
      data: {
        barbershopId,
        billingType: 'prepaid',
        chargeGatewayPlanId: plano.id,
        interval,
        price: totalAmount,
        serviceId,
      },
    });
    return response;
  }

  async findAll() {
    return await this.prisma.plan.findMany();
  }
  async findAllByBarbershopId(barbershopId: string) {
    return await this.prisma.plan.findMany({
      where: { barbershopId },
      include: { service: true },
    });
  }

  async findOne(id: string) {
    return await this.prisma.plan.findFirst({ where: { id } });
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    return await this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.plan.delete({ where: { id } });
  }
}
