import { Test, TestingModule } from '@nestjs/testing';

import { SpookyswapController } from './spookyswap.controller';

describe('SpookyswapController', () => {
  let controller: SpookyswapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpookyswapController],
    }).compile();

    controller = module.get<SpookyswapController>(SpookyswapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
