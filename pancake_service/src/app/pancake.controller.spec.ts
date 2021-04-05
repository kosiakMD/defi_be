import { Test, TestingModule } from '@nestjs/testing';

import { PancakesCachedService } from './pancake.cached.service';
import { PancakesController } from './pancake.controller';
import { PancakesService } from './pancake.service';

describe('PancakesController', () => {
	let pancakesService: PancakesService;

	beforeEach(async () => {
		const moduleRef: TestingModule = await Test.createTestingModule({
			controllers: [PancakesController],
			providers: [PancakesService, PancakesCachedService],
		}).compile();

		pancakesService = moduleRef.get<PancakesService>(PancakesService);
	});

	describe('GET v1/pancakes/', () => {
		it('should return pancakes', async () => {
			expect(typeof (await pancakesService.getPancakes())).toBe('object');
		});
	});
});
