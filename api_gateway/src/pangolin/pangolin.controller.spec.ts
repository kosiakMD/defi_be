import { Test, TestingModule } from '@nestjs/testing';

import { PangolinController } from './pangolin.controller';

describe('PangolinController', () => {
  let controller: PangolinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PangolinController],
    }).compile();

    controller = module.get<PangolinController>(PangolinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
