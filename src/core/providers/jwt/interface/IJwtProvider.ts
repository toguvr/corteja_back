export abstract class IJwtProvider {
  abstract sign(sub: string): string;
}
