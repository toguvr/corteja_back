import { Injectable } from '@nestjs/common';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBarberDto: Prisma.BarberCreateInput) {
    const response = await this.prisma.barber.create({
      data: { ...createBarberDto },
    });
    return response;
  }

  async findAll() {
    const response = await this.prisma.barber.findMany();
    return response;
  }

  async findOne(id: string) {
    const response = await this.prisma.barber.findFirst({ where: { id } });
    return response;
  }
  async findAllByBarbershopId(barbershopId: string) {
    const response = await this.prisma.barber.findMany({
      where: { barbershopId },
    });
    return response;
  }
  async update(id: string, updateBarberDto: UpdateBarberDto) {
    const response = await this.prisma.barber.update({
      where: { id },
      data: updateBarberDto,
    });
    return response;
  }

  async remove(id: string) {
    const response = await this.prisma.barber.delete({ where: { id } });
    return response;
  }
}
