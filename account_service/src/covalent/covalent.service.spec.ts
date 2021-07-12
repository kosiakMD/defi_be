import { Test, TestingModule } from '@nestjs/testing';

import { CovalentService } from './covalent.service';

describe('CovalentService', () => {
  let service: CovalentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CovalentService],
    }).compile();

    service = module.get<CovalentService>(CovalentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
