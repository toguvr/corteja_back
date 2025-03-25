import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';
import { AuthenticationsModule } from './auth/authentications.module';
import { PrismaModule } from '@/core/database/prisma.module';
import { BarbersModule } from './barbers/barbers.module';
import { BarbershopsModule } from './barbershops/barbershops.module';
import { ServicesModule } from './services/services.module';
import { PaymentsModule } from './payments/payments.module';
import { BalancesModule } from './balances/balances.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BanksModule } from './banks/banks.module';
import { AddressesModule } from './addresses/addresses.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    AuthenticationsModule,
    PrismaModule,
    BarbersModule,
    ServicesModule,
    PaymentsModule,
    BalancesModule,
    AppointmentsModule,
    SchedulesModule,
    BanksModule,
    AddressesModule,
    CustomersModule,
    BarbershopsModule,
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
