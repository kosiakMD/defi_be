import { Test, TestingModule } from '@nestjs/testing';
import { ExamplesController } from './example.controller';
import { ExamplesService } from './example.service';

describe('ExampleController', () => {
  let examplesController: ExamplesController;

  beforeEach(async () => {
    const example: TestingModule = await Test.createTestingModule({
      controllers: [ExamplesController],
      providers: [ExamplesService],
    }).compile();

    examplesController = example.get<ExamplesController>(ExamplesController);
  });

  describe('root', () => {
    it('should return "This action returns all examples"', () => {
      expect(examplesController.findAll()).toBe('This action returns all examples');
    });
  });
});
