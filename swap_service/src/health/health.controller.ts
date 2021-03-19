import { Controller, Get } from '@nestjs/common';
import {
	HealthCheck,
	HealthCheckService,
	HealthIndicatorResult,
} from '@nestjs/terminus';

@Controller('status')
export class HealthController {
	constructor(private health: HealthCheckService) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			async (): Promise<HealthIndicatorResult> => ({
				server: {
					status: 'up',
				},
				// TODO: ? add DB health check ?
				db: {
					status: 'down',
				},
			}),
		]);
	}
}
