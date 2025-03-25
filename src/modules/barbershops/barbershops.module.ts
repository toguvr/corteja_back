import { Module } from '@nestjs/common';
import { BarbershopsService } from './barbershops.service';
import { BarbershopsController } from './barbershops.controller';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';
import CryptHashProvider from '@/core/providers/hash/implementations/crypt-hash.provider';

@Module({
  controllers: [BarbershopsController],
  providers: [
    BarbershopsService,
    {
      provide: IHashProvider,
      useClass: CryptHashProvider,
    },
  ],
})
export class BarbershopsModule {}
