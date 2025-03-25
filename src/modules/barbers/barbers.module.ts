import { Module } from '@nestjs/common';
import { BarbersService } from './barbers.service';
import { BarbersController } from './barbers.controller';

@Module({
  controllers: [BarbersController],
  providers: [BarbersService],
})
export class BarbersModule {}
