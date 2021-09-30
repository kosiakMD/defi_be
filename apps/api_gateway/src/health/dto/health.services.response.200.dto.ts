import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckResult, HealthIndicatorResult } from '@nestjs/terminus';
import { HealthCheckStatus } from '@nestjs/terminus/dist/health-check';

import { HealthStatusEnum } from '@app/common/enum';

import { HealthServicesDto } from './health.services.info.dto';

export class HealthServicesResponse200Dto implements HealthCheckResult {
  @ApiProperty({ enum: HealthStatusEnum, enumName: 'HealthStatus' })
  status: HealthCheckStatus;

  @ApiProperty({ type: HealthServicesDto, required: false })
  info?: HealthIndicatorResult;

  @ApiProperty({ type: Object, example: {}, required: false })
  error?: HealthIndicatorResult;

  @ApiProperty({ type: HealthServicesDto })
  details: HealthIndicatorResult;
}
