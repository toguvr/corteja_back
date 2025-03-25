import { Injectable } from '@nestjs/common';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAddressDto: Prisma.AddressCreateInput) {
    const response = await this.prisma.address.create({
      data: { ...createAddressDto },
    });
    return response;
  }

  async findAll() {
    return await this.prisma.address.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.address.findFirst({ where: { id } });
  }

  async update(id: string, updateAddressDto: UpdateAddressDto) {
    return await this.prisma.address.update({
      where: { id },
      data: updateAddressDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.address.delete({ where: { id } });
  }
}
