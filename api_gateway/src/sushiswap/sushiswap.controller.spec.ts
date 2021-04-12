import { Test, TestingModule } from '@nestjs/testing';

import { SushiswapController } from './sushiswap.controller';

describe('SushiswapController', () => {
  let controller: SushiswapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SushiswapController],
    }).compile();

    controller = module.get<SushiswapController>(SushiswapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
