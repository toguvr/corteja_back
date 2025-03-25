import { Injectable } from '@nestjs/common';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBalanceDto: Prisma.BalanceCreateInput) {
    const response = await this.prisma.balance.create({
      data: { ...createBalanceDto },
    });
    return response;
  }

  async findAll() {
    return await this.prisma.balance.findMany();
  }
  async findMine({
    barbershopId,
    customerId,
  }: {
    customerId: string;
    barbershopId: string;
  }) {
    const balances = await this.prisma.balance.findMany({
      where: { customerId, ...(barbershopId ? { barbershopId } : {}) },
    });

    const totalBalance = balances.reduce((acc, balance) => {
      if (!balance.amount) return acc;
      return balance.type === 'INCOME'
        ? acc + balance.amount
        : acc - balance.amount;
    }, 0);

    return totalBalance;
  }

  async findOne(id: string) {
    return await this.prisma.balance.findFirst({ where: { id } });
  }

  async update(id: string, updateBalanceDto: UpdateBalanceDto) {
    return await this.prisma.balance.update({
      where: { id },
      data: updateBalanceDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.balance.delete({ where: { id } });
  }
}
