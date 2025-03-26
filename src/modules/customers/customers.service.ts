import { ConflictException, Injectable } from '@nestjs/common';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashProvider: IHashProvider,
  ) {}

  async create({ email, phone, password, name }: Prisma.CustomerCreateInput) {
    if (!email) {
      throw new ConflictException('Email não informado!');
    }
    const checkUserExist = await this.prisma.customer.findFirst({
      where: { email: email as string },
    });

    if (checkUserExist) {
      throw new ConflictException('Email já em uso!');
    }

    const hashedPassword = await this.hashProvider.generateHash(password);

    const user = await this.prisma.customer.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
      },
    });

    return user;
  }

  async findAll() {
    return await this.prisma.customer.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.customer.findFirst({ where: { id } });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    return await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.customer.delete({ where: { id } });
  }
}
