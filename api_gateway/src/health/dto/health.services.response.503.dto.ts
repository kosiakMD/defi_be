import { ApiProperty } from '@nestjs/swagger';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus/dist/health-check';

import { HealthServiceStatusEnum, HealthStatusEnum } from 'src/common/enum';

import { HealthServicesDto } from './health.services.info.dto';
import { HealthErrorDto } from './heath.error.dto';

const HealthServicesExample = {
  accountService: {
    status: HealthServiceStatusEnum.up,
  },
  accountServiceDatabase: {
    status: HealthServiceStatusEnum.up,
  },
  integrationService: {
    status: HealthServiceStatusEnum.down,
  },
  priceService: {
    status: HealthServiceStatusEnum.up,
  },
  priceServiceDatabase: {
    status: HealthServiceStatusEnum.up,
  },
};

export class HealthServicesResponse503Dto implements HealthCheckResult {
  @ApiProperty({
    enum: HealthStatusEnum,
    enumName: 'HealthStatusEnum',
    example: HealthStatusEnum.error,
  })
  status: HealthCheckStatus;

  @ApiProperty({
    type: HealthServicesDto,
    required: false,
    example: HealthServicesExample,
  })
  info?: HealthIndicatorResult;

  @ApiProperty({
    type: HealthErrorDto,
    example: {
      integrationService: {
        status: HealthServiceStatusEnum.down,
      },
    },
    required: false,
  })
  error?: HealthIndicatorResult;

  @ApiProperty({
    type: HealthServicesDto,
    example: HealthServicesExample,
  })
  details: HealthIndicatorResult;
}
