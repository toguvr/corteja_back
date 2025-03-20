import { IJwtProvider } from '../interface/IJwtProvider';

class FakeJWTProvider implements IJwtProvider {
  public sign(payload: string): string {
    return payload;
  }
}

export default FakeJWTProvider;
