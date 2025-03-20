import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../interface/IUserRepository';
import { PrismaService } from 'src/core/database/prisma.service';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from '../../dto/create-user.dto';

@Injectable()
class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });

    return (data as User) || null;
  }

  async save(data: CreateUserDto): Promise<User> {
    const user = await this.prisma.user.create({
      data,
    });

    return user as User;
  }

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { id },
    });

    return data as User;
  }
}

export default PrismaUserRepository;
