import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PrismaService } from '@/core/database/prisma.service';
import * as pagarme from '@pagarme/sdk';
const privateKey = process.env.PAGARME_API;
pagarme.Configuration.basicAuthUserName = privateKey;
@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubscriptionDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: createSubscriptionDto?.customerId as string },
    });
    if (!customer) {
      throw new ConflictException('Cliente não encontrado.');
    }
    if (!createSubscriptionDto.cardId) {
      throw new ConflictException('Cartão não encontrado.');
    }
    const plan = await this.prisma.plan.findUnique({
      where: { id: createSubscriptionDto?.planId as string },
    });
    if (!plan) {
      throw new ConflictException('Plano não encontrado.');
    }
    const subscription = await this.prisma.subscription.create({
      data: {
        cardId: customer.cardId,
        planId: plan.id,
        customerId: createSubscriptionDto.customerId,
        barbershopId: createSubscriptionDto.barbershopId,
        barberId: createSubscriptionDto.barberId,
        scheduleId: createSubscriptionDto.scheduleId,
      },
    });
    const assinaturaRequest = new pagarme.CreateSubscriptionRequest({
      // plan_id: plan.chargeGatewayPlanId, // ID do plano criado
      pricing_scheme: {
        scheme_type: 'unit',
        price: Math.round(Number(plan.price)),
      },
      customer_id: customer.customerChargeGatewayId,
      quantity: 1, // quantas vezes aplicar o valor do plano
      payment_method: 'credit_card',
      description: `Assinatura ${plan?.interval === 'week' ? 'semanal' : 'mensal'}`,
      card_id: createSubscriptionDto.cardId,
      metadata: {
        barbershopId: createSubscriptionDto.barbershopId,
        customerId: customer?.id, // ID do cliente no seu sistema (opcional, mas muito útil)
        subscriptionId: subscription?.id, // ID do cliente no seu sistema (opcional, mas muito útil)
      },
    });
    const assinatura =
      await pagarme.SubscriptionsController.createSubscription(
        assinaturaRequest,
      );
    const newSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        chargeGatewaySubscriptionId: assinatura.id,
      },
    });

    return newSubscription;
  }

  async findAll() {
    return await this.prisma.subscription.findMany();
  }
  async findAllMine(customerId: string) {
    return await this.prisma.subscription.findMany({
      where: { customerId },
      include: {
        plan: true,
        barber: true,
        schedule: true,
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.subscription.findFirst({ where: { id } });
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto) {
    return await this.prisma.subscription.update({
      where: { id },
      data: updateSubscriptionDto,
    });
  }

  async remove(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!subscription) {
      throw new BadRequestException('Assinatura não encontrada.');
    }
    if (subscription.canceledAt) {
      throw new BadRequestException('Assinatura já cancelada.');
    }
    // if (subscription.active === false) {
    //   throw new BadRequestException('Assinatura já inativada.');
    // }
    if (!subscription.chargeGatewaySubscriptionId) {
      throw new BadRequestException('Assinatura não encontrada.');
    }
    const options = {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${btoa(privateKey + ':')}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },

      body: JSON.stringify({ cancel_pending_invoices: true }),
    };

    const res = await fetch(
      `https://api.pagar.me/core/v5/subscriptions/${subscription.chargeGatewaySubscriptionId}`,
      options,
    )
      .then((res) => res.json())
      .then((res) => console.log(res))
      .catch((err) => console.error(err));

    const newSubscription = await this.prisma.subscription.update({
      where: { id: subscription?.id },
      data: {
        canceledAt: new Date(),
        active: false,
      },
    });
    return newSubscription;
  }
}
