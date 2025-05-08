import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { SchedulesService } from '../schedules/schedules.service';
import { CustomersService } from '../customers/customers.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { BalancesService } from '../balances/balances.service';
import { OrdersService } from '../orders/orders.service';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';
import CryptHashProvider from '@/core/providers/hash/implementations/crypt-hash.provider';

@Module({
  controllers: [ChatsController],
  providers: [
    ChatsService,
    SchedulesService,
    CustomersService,
    AppointmentsService,
    BalancesService,
    OrdersService,
    {
      provide: IHashProvider,
      useClass: CryptHashProvider,
    },
  ],
})
export class ChatsModule {}
