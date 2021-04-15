import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  HealthCheckResult,
} from '@nestjs/terminus';

@Controller('status')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
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
