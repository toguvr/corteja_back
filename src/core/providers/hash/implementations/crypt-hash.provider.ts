import { Injectable } from '@nestjs/common';
import { IHashProvider } from '../interface/IHashProvider';
import { hash, compare } from 'bcryptjs';

@Injectable()
class CryptHashProvider implements IHashProvider {
  public async generateHash(payload: string): Promise<string> {
    return await hash(payload, 8);
  }

  public async compareHash(payload: string, hashed: string): Promise<boolean> {
    return compare(payload, hashed);
  }
}

export default CryptHashProvider;
