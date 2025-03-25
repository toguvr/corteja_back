import { Injectable } from '@nestjs/common';
import { UpdateBankDto } from './dto/update-bank.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BanksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBankDto: Prisma.BankCreateInput) {
    const response = await this.prisma.bank.create({
      data: { ...createBankDto },
    });
    return response;
  }

  async findAll() {
    return await this.prisma.bank.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.bank.findFirst({ where: { id } });
  }

  async update(id: string, updateBankDto: UpdateBankDto) {
    return await this.prisma.bank.update({
      where: { id },
      data: updateBankDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.bank.delete({ where: { id } });
  }
}
