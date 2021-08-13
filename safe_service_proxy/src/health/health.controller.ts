import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import { camelize } from '../utils/string';

enum StatusEnum {
  up = 'up',
  down = 'down',
}

@Controller('status')
export class HealthController {
  constructor(
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
    ]);
  }
}
