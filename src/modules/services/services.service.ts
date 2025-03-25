import { Injectable } from '@nestjs/common';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createServiceDto: Prisma.ServiceCreateInput) {
    const response = await this.prisma.service.create({
      data: { ...createServiceDto },
    });
    return response;
  }

  async findAll() {
    const response = await this.prisma.service.findMany();
    return response;
  }

  async findOne(id: string) {
    const response = await this.prisma.service.findFirst({ where: { id } });
    return response;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const response = await this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
    });
    return response;
  }

  async remove(id: string) {
    const response = await this.prisma.service.delete({ where: { id } });
    return response;
  }
}
