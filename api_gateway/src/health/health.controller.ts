import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
	HealthCheck,
	HealthCheckService,
	HealthIndicatorResult,
	HealthIndicatorStatus,
	HttpHealthIndicator,
} from '@nestjs/terminus';

import { ServiceHealthIndicator } from '../app/app.health';
import { AddVersion } from '../decorators/AddVersion';

interface ServiceHealthStatus extends HealthIndicatorResult {
	[service: string]: {
		status: HealthIndicatorStatus;
	};
}

export const ServiceHealthOk: ServiceHealthStatus = {
	service: {
		status: 'up',
	},
};

@ApiTags('Status')
@Controller('status')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private http: HttpHealthIndicator,
		private serviceHealthIndicator: ServiceHealthIndicator,
	) {}

	@AddVersion('v1')
	@Get('/')
	@HealthCheck()
	check() {
		return this.health.check([async (): Promise<HealthIndicatorResult> => ServiceHealthOk]);
	}

	@AddVersion('v1')
	@Get('/services')
	@HealthCheck()
	checkServices() {
		return this.health.check([
			async () => this.serviceHealthIndicator.isHealthy('service'),
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			// async () => {
			// 	const options = {
			// 		port: 3011,
			// 		host: process.env.HOST,
			// 		path: '/status',
			// 	};
			// 	return http.request(options, (res) => {
			// 		console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
			// 		console.log(res);
			// 	});
			// },
		]);
	}
}
