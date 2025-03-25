import { Test, TestingModule } from '@nestjs/testing';
import { BarbershopsController } from './barbershops.controller';
import { BarbershopsService } from './barbershops.service';

describe('BarbershopsController', () => {
  let controller: BarbershopsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarbershopsController],
      providers: [BarbershopsService],
    }).compile();

    controller = module.get<BarbershopsController>(BarbershopsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
