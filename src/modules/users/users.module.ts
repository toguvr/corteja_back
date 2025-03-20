import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '@/core/database/prisma.module';
import { IUserRepository } from './repositories/interface/IUserRepository';
import PrismaUserRepository from './repositories/implementations/prisma-user.repository';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';
import CryptHashProvider from '@/core/providers/hash/implementations/crypt-hash.provider';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: IUserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: IHashProvider,
      useClass: CryptHashProvider,
    },
  ],
})
export class UsersModule {}
