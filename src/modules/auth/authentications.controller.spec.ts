import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationsService } from './authentications.service';
import { AuthenticationsController } from './authentications.controller';

describe('AuthenticationsController', () => {
  let controller: AuthenticationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationsController],
      providers: [AuthenticationsService],
    }).compile();

    controller = module.get<AuthenticationsController>(
      AuthenticationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
