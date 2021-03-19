import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from '../app/app.health';

describe('HealthController', () => {
	let controller: HealthController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [TerminusModule],
			controllers: [HealthController],
			providers: [ServiceHealthIndicator],
		}).compile();

		controller = module.get<HealthController>(HealthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
		// expect(controller.check()).toBe({
		//   'status': 'ok',
		//   'info': ServiceHealthOk,
		//   'error': {},
		//   'details': ServiceHealthOk,
		// });
	});
});
