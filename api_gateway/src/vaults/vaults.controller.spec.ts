import { Test, TestingModule } from '@nestjs/testing';

import { VaultsController } from './vaults.controller';

describe('PoolsController', () => {
  let controller: VaultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VaultsController],
    }).compile();

    controller = module.get<VaultsController>(VaultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
