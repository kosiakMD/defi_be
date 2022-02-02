import { ApiProperty } from '@nestjs/swagger';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus/dist/health-check';

import { HealthServiceStatusEnum, HealthStatusEnum } from '@app/common/enum';

import { HealthServicesDto } from './health.services.info.dto';
import { HealthErrorDto } from './heath.error.dto';

const HealthServicesInfoErrorExample = {
  accountService: {
    status: HealthServiceStatusEnum.down,
  },
  accountServiceDataBase: {
    status: HealthServiceStatusEnum.down,
  },
  integrationService: {
    status: HealthServiceStatusEnum.up,
  },
  integrationServiceDataBase: {
    status: HealthServiceStatusEnum.up,
  },
  priceService: {
    status: HealthServiceStatusEnum.up,
  },
  priceServiceDataBase: {
    status: HealthServiceStatusEnum.up,
  },
};

const HealthServicesDetailsErrorExample = {
  ...HealthServicesInfoErrorExample,
  accountService: {
    status: HealthServiceStatusEnum.down,
    message: {
      response: {
        statusCode: 503,
        message: 'Service Unavailable',
      },
      status: 503,
      message: 'Service Unavailable',
      name: 'ServiceUnavailableException',
    },
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
    example: HealthServicesInfoErrorExample,
  })
  info?: HealthIndicatorResult;

  @ApiProperty({
    type: HealthErrorDto,
    // required: false,
    example: {
      accountService: {
        status: HealthServiceStatusEnum.down,
      },
    },
  })
  error?: HealthIndicatorResult;

  @ApiProperty({
    type: HealthServicesDto,
    example: HealthServicesDetailsErrorExample,
  })
  details: HealthIndicatorResult;
}
