import { Connection } from 'typeorm';

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  HealthCheckResult,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';

import { camelize } from '../common/utils/string';

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
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => ({
        [camelize(this.configService.get<string>('SERVICE_NAME'))]: {
          status: StatusEnum.up,
        },
      }),
      async (): Promise<HealthIndicatorResult> => ({
        [camelize(this.configService.get<string>('SERVICE_NAME'), 'Database')]: {
          status: this.connection.isConnected ? StatusEnum.up : StatusEnum.down,
        },
      }),
    ]);
  }
}
