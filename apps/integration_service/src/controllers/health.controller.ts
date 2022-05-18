import { Connection } from 'typeorm';

import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { camelize } from '@app/common/utils';

enum StatusEnum {
  up = 'up',
  down = 'down',
}

@Controller('v1/status')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly health: HealthCheckService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
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
