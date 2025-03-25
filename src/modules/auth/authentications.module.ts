import { Module } from '@nestjs/common';
import { AuthenticationsService } from './authentications.service';
import { AuthenticationsController } from './authentications.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { IHashProvider } from 'src/core/providers/hash/interface/IHashProvider';
import CryptHashProvider from 'src/core/providers/hash/implementations/crypt-hash.provider';
import { IJwtProvider } from 'src/core/providers/jwt/interface/IJwtProvider';
import JwtProvider from 'src/core/providers/jwt/implementations/jwt.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { Env } from '../env';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory(config: ConfigService<Env, true>) {
        const publicKey = config.get('JWT_SECRET', { infer: true });

        return {
          secret: publicKey,
        };
      },
    }),
  ],
  controllers: [AuthenticationsController],
  providers: [
    JwtStrategy,
    AuthenticationsService,
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
