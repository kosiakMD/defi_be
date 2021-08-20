import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorStatus,
  HttpHealthIndicator,
} from '@nestjs/terminus';

import { AddVersion } from 'src/common/decorators/AddVersion';
import { HealthStatusEnum } from 'src/common/enum';

import { ServiceHealthIndicator } from '../app/app.health';
import { HealthServicesResponse200Dto } from './dto/health.services.response.200.dto';
import { HealthServicesResponse503Dto } from './dto/health.services.response.503.dto';

interface ServiceHealthStatus extends HealthIndicatorResult {
  [service: string]: {
    status: HealthIndicatorStatus;
  };
}

export const ServiceHealthOk: ServiceHealthStatus = {
  service: {
    status: 'up',
  },
};

@ApiTags('Status')
@Controller('status')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private serviceHealthIndicator: ServiceHealthIndicator,
  ) {}

  @AddVersion('v1')
  @Get('/')
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([async (): Promise<HealthIndicatorResult> => ServiceHealthOk]);
  }

  @AddVersion('v1')
  @Get('/services')
  @ApiResponse({
    type: HealthServicesResponse200Dto,
    status: 200,
  })
  @ApiResponse({
    type: HealthServicesResponse503Dto,
    status: 503,
    description: 'In case any service is down',
  })
  @HealthCheck()
  async checkServices(): Promise<any> {
    const result = {
      status: HealthStatusEnum.ok,
      info: {},
      error: {},
      details: {},
    };
    const statuses = await Promise.all([
      this.serviceHealthIndicator.isAccountHealthy(),
      this.serviceHealthIndicator.isIntegrationHealthy(),
      this.serviceHealthIndicator.isPriceHealthy(),
    ]);
    statuses.forEach((service) => {
      // TODO: For short variant of info: { [serviceName]: [status: 'ok' | 'error']}
      // Object.keys(service.info).forEach((key) => {
      //   Object.assign(result.info, {
      //     [key]: service.info[key].status === 'up' ? 'ok' : 'error',
      //   });
      // });
      Object.assign(result.info, service.info);
      Object.assign(result.error, service.error);
      Object.assign(result.details, service.details);
    });
    if (Object.keys(result.error).length) {
      result.status = HealthStatusEnum.error;
      throw new ServiceUnavailableException(result);
    }
    return result;
    // throw new HealthCheckError('Services check failed', result);
  }
}
