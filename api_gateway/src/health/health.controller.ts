import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorStatus,
  HttpHealthIndicator,
} from '@nestjs/terminus';

import { ServiceHealthIndicator } from '../app/app.health';
import { AddVersion } from '../common/decorators/AddVersion';

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
  check(): Promise<HealthCheckResult> {
    return this.health.check([async (): Promise<HealthIndicatorResult> => ServiceHealthOk]);
  }

  @AddVersion('v1')
  @Get('/services')
  @HealthCheck()
  checkServices(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.serviceHealthIndicator.isPriceHealthy(),
      async (): Promise<HealthIndicatorResult> => this.serviceHealthIndicator.isPriceHealthy(),
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
