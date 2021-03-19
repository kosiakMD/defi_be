import { Controller, Get } from '@nestjs/common';
import {
	HealthCheck,
	HealthCheckService,
	HealthIndicatorResult,
	HealthIndicatorStatus,
	HttpHealthIndicator,
} from '@nestjs/terminus';
import { ServiceHealthIndicator } from '../app/app.health';

// import * as http from 'http';

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

@Controller('health')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private http: HttpHealthIndicator,
		private serviceHealthIndicator: ServiceHealthIndicator,
	) {}

	@Get('/')
	@HealthCheck()
	check() {
		return this.health.check([
			async (): Promise<HealthIndicatorResult> => ServiceHealthOk,
		]);
	}

	@Get('/services')
	@HealthCheck()
	checkServices() {
		return this.health.check([
			async () => this.serviceHealthIndicator.isHealthy('service'),
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			// async () => {
			// 	const options = {
			// 		port: 3001,
			// 		host: process.env.HOST,
			// 		path: '/health',
			// 	};
			// 	return http.request(options, (res) => {
			// 		console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
			// 		console.log(res);
			// 	});
			// },
		]);
	}
}
