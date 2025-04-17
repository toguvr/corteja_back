import { ConflictException, Injectable } from '@nestjs/common';
import { UpdateStampDto } from './dto/update-stamp.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StampsService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    customerId,
    barbershopId,
  }: {
    customerId: string;
    barbershopId: string;
  }) {
    const totalStamps = await this.prisma.loyaltyStamp.count({
      where: { customerId, barbershopId },
    });

    const totalRewards = await this.prisma.balance.count({
      where: {
        customerId,
        barbershopId,
        type: 'LOYALTY_REWARD',
        status: 'received',
      },
    });
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId },
    });
    const requiredStamps = barbershop?.loyaltyStamps ?? 10;

    const availableCycles = Math.floor(totalStamps / requiredStamps);
    const redeemedCycles = totalRewards;

    if (availableCycles > redeemedCycles) {
      // Ele pode resgatar
      await this.prisma.balance.create({
        data: {
          customerId,
          barbershopId,
          amount: barbershop?.loyaltyReward ?? 4000,
          status: 'received',
          type: 'LOYALTY_REWARD',
          paymentDate: new Date(),
        },
      });

      return { ok: true };
    } else {
      // Já resgatou tudo o que podia
      throw new ConflictException(
        'Você não possui selos suficientes para resgatar.',
      );
    }
  }

  async findAll() {
    return await this.prisma.loyaltyStamp.findMany();
  }

  async count(customerId: string, barbershopId: string) {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId },
    });
    const requiredStamps = barbershop?.loyaltyStamps ?? 10;

    const totalStamps = await this.prisma.loyaltyStamp.count({
      where: {
        customerId,
        barbershopId,
      },
    });

    // total de ciclos completos
    const completedCycles = Math.floor(totalStamps / requiredStamps);

    // selos atuais do ciclo em andamento
    const currentStamps = totalStamps % requiredStamps;

    return { totalStamps: currentStamps, completedCycles };
  }

  async findOne(id: string) {
    return await this.prisma.loyaltyStamp.findFirst({ where: { id } });
  }

  async update(id: string, updateStampDto: UpdateStampDto) {
    return await this.prisma.loyaltyStamp.update({
      where: { id },
      data: updateStampDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.loyaltyStamp.delete({ where: { id } });
  }
}
