import { Test, TestingModule } from '@nestjs/testing';
import { BarbershopsService } from './barbershops.service';

describe('BarbershopsService', () => {
  let service: BarbershopsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BarbershopsService],
    }).compile();

    service = module.get<BarbershopsService>(BarbershopsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
