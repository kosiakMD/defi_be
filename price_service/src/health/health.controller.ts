import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('status')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly health: HealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => ({
        server: {
          status: 'up',
        },
        db: {
          status: this.connection.isConnected ? 'up' : 'down',
        },
      }),
    ]);
  }
}
