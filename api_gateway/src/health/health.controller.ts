import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { ServiceHealthIndicator } from '../app/app.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private serviceHealthIndicator: ServiceHealthIndicator
  ) {}

  @Get('/')
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
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
