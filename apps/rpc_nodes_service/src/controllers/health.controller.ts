import { Connection } from 'typeorm';

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';

import { camelize } from '@app/common/utils';

enum StatusEnum {
  up = 'up',
  down = 'down',
}

@ApiTags('Health')
@Controller('status')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly health: HealthCheckService,
    private readonly configService: ConfigService,
    private microservice: MicroserviceHealthIndicator,
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
      () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: this.configService.get('REDIS_HOST'),
            port: this.configService.get('REDIS_PORT'),
            password: this.configService.get('REDIS_AUTH'),
          },
        }),
    ]);
  }
}
