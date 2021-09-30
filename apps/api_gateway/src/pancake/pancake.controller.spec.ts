import { Test, TestingModule } from '@nestjs/testing';

import { PancakeController } from './uniswap.controller';

describe('UniswapController', () => {
  let controller: PancakeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PancakeController],
    }).compile();

    controller = module.get<PancakeController>(PancakeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
