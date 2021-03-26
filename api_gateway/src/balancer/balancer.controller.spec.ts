import { Test, TestingModule } from '@nestjs/testing';
import { BalancerController } from './balancer.controller';

describe('BalancerController', () => {
  let controller: BalancerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalancerController],
    }).compile();

    controller = module.get<BalancerController>(BalancerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
