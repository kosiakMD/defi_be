import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

enum StatusEnum {
  up = 'up',
  down = 'down',
}

@Controller('status')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly health: HealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => ({
        priceService: {
          status: StatusEnum.up,
        },
      }),
      async (): Promise<HealthIndicatorResult> => ({
        priceDatabase: {
          status: this.connection.isConnected ? StatusEnum.up : StatusEnum.down,
        },
      }),
    ]);
  }
}
