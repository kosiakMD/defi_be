import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult, HttpHealthIndicator } from '@nestjs/terminus';
import { ServiceHealthIndicator } from '../app/app.health';
import { HealthIndicatorStatus } from '@nestjs/terminus/dist/health-indicator/health-indicator-result.interface';

interface ServiceHealthStatus extends HealthIndicatorResult {
  [service: string]: {
    status: HealthIndicatorStatus;
  }
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
  ) {
  }

  @Get('/')
  @HealthCheck()
  check() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => (ServiceHealthOk),
    ]);
  }

  @Get('/services')
  @HealthCheck()
  checkServices() {
    return this.health.check([
      async () => this.serviceHealthIndicator.isHealthy('service'),
    ]);
  }
}
