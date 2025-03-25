import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UpdateAuthenticationDto } from './dto/update-authentication.dto';
import { IHashProvider } from 'src/core/providers/hash/interface/IHashProvider';
import { IJwtProvider } from 'src/core/providers/jwt/interface/IJwtProvider';
import { PrismaService } from '@/core/database/prisma.service';

@Injectable()
export class AuthenticationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashProvider: IHashProvider,
    private readonly jwtProvider: IJwtProvider,
  ) {}
  async create(createAuthenticationDto: CreateAuthenticationDto) {
    const { email, password } = createAuthenticationDto;

    const checkUserExist = await this.prisma.barbershop.findFirst({
      where: { email },
    });

    if (!checkUserExist) {
      throw new UnauthorizedException('Email ou senha incorretos!');
    }

    const isPasswordValid = await this.hashProvider.compareHash(
      password,
      checkUserExist.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha incorretos!');
    }

    const accessToken = this.jwtProvider.sign(checkUserExist.id);

    return { access_token: accessToken };
  }

  findAll() {
    return `This action returns all authentications`;
  }

  findOne(id: number) {
    return `This action returns a #${id} authentication`;
  }

  update(id: number, updateAuthenticationDto: UpdateAuthenticationDto) {
    return `This action updates a #${id} authentication`;
  }

  remove(id: number) {
    return `This action removes a #${id} authentication`;
  }
}
