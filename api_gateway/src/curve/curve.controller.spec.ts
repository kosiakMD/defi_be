import { Test, TestingModule } from '@nestjs/testing';
import { CurveController } from './curve.controller';

describe('CurveController', () => {
  let controller: CurveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurveController],
    }).compile();

    controller = module.get<CurveController>(CurveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
