import { Injectable } from '@nestjs/common';
import { IJwtProvider } from '../interface/IJwtProvider';
import { JwtService } from '@nestjs/jwt';

@Injectable()
class JwtProvider implements IJwtProvider {
  constructor(private jwt: JwtService) {}
  public sign(sub: string): string {
    return this.jwt.sign({ sub });
  }
}

export default JwtProvider;
