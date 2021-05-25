import { Test, TestingModule } from '@nestjs/testing';

import { HireService } from './hire.service';

describe('HireService', () => {
  let service: HireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HireService],
    }).compile();

    service = module.get<HireService>(HireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
