import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';
import { UsersModule } from './users/users.module';
import { AuthenticationsModule } from './auth/authentications.module';

@Module({
  imports: [
    AuthenticationsModule,
    UsersModule,
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
