import { Module } from '@nestjs/common';
import { AuthenticationsService } from './authentications.service';
import { AuthenticationsController } from './authentications.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IHashProvider } from 'src/core/providers/hash/interface/IHashProvider';
import CryptHashProvider from 'src/core/providers/hash/implementations/crypt-hash.provider';
import { IJwtProvider } from 'src/core/providers/jwt/interface/IJwtProvider';
import JwtProvider from 'src/core/providers/jwt/implementations/jwt.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Env } from '@/modules/env';
import { IUserRepository } from '../users/repositories/interface/IUserRepository';
import PrismaUserRepository from '../users/repositories/implementations/prisma-user.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory(config: ConfigService<Env, true>) {
        const privateKey = config.get('JWT_PRIVATE_KEY', { infer: true });
        const publicKey = config.get('JWT_PUBLIC_KEY', { infer: true });

        return {
          signOptions: { algorithm: 'RS256' },
          privateKey: Buffer.from(privateKey, 'base64'),
          publicKey: Buffer.from(publicKey, 'base64'),
        };
      },
    }),
  ],
  controllers: [AuthenticationsController],
  providers: [
    JwtStrategy,
    AuthenticationsService,
    {
      provide: IUserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: IHashProvider,
      useClass: CryptHashProvider,
    },
    {
      provide: IJwtProvider,
      useClass: JwtProvider,
    },
  ],
})
export class AuthenticationsModule {}
