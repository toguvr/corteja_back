import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';
import CryptHashProvider from '@/core/providers/hash/implementations/crypt-hash.provider';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomersService,
    {
      provide: IHashProvider,
      useClass: CryptHashProvider,
    },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
