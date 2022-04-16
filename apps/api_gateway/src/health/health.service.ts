import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult, HealthIndicator } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { HealthServiceStatusEnum, HealthStatusEnum, ServiceEnum } from '@app/common/enum';
import { toCamelCase } from '@app/common/utils';

/** example
 interface HealthCheckResult {
  status: HealthCheckStatus;
  info: HealthIndicatorResult;
  error?: HealthIndicatorResult;
  details?: HealthIndicatorResult;
}
 */

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  private readonly getAccountStatusUrl: string;
  private readonly getIntegrationStatusUrl: string;
  private readonly getPriceStatusUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    super();

    this.getAccountStatusUrl = this.getServiceUrl(ServiceEnum.Account);
    this.getIntegrationStatusUrl = this.getServiceUrl(ServiceEnum.Integration);
    this.getPriceStatusUrl = this.getServiceUrl(ServiceEnum.Price);
    this.getAccountStatusUrl = this.getServiceUrl('ACCOUNT');
    this.getIntegrationStatusUrl = this.getServiceUrl('INTEGRATION');
    this.getPriceStatusUrl = this.getServiceUrl('PRICE');
  }

  public async isAccountHealthy(): Promise<HealthCheckResult> {
    return this.healthyRequest(ServiceEnum.Account);
  }

  public async isIntegrationHealthy(): Promise<HealthCheckResult> {
    return this.healthyRequest(ServiceEnum.Integration);
  }

  public async isPriceHealthy(): Promise<HealthCheckResult> {
    return this.healthyRequest(ServiceEnum.Price);
  }

  private getServiceUrl(serviceName: string): string {
    const service = serviceName.toUpperCase();
    const host = this.configService.get<string>(`${service}_SERVICE_HOST`);
    const port = this.configService.get<string>(`${service}_SERVICE_PORT`);
    const url = `${host}${port ? ':' + port : ''}`;
    const getStatusUrl = this.configService.get<string>(`${service}_STATUS`);
    return `${url}/${getStatusUrl}`;
  }

  private async isServiceHealthy(getStatusUrl: string): Promise<HealthCheckResult> {
    try {
      this.logger.time('request: ' + getStatusUrl);
      const { data } = await this.httpService
        .get(getStatusUrl)
        .toPromise();
      this.logger.timeEnd('request: ' + getStatusUrl);
      return data;
    } catch (e: any) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  private async healthyRequest(serviceName: ServiceEnum): Promise<HealthCheckResult> {
    try {
      const getStatusUrl = this[`get${serviceName}StatusUrl`];
      return await this.isServiceHealthy(getStatusUrl);
    } catch (e: any) {
      this.logger.error(e, 'healthyRequest', 'ServiceHealthIndicator');
      Sentry.captureException(e, {
        level: Severity.Error,
        extra: { class: 'ServiceHealthIndicator', method: 'healthyRequest' },
      });
      return {
        status: HealthStatusEnum.shuttingDown,
        info: {
          [toCamelCase(`${serviceName}Service`)]: {
            status: HealthServiceStatusEnum.down,
          },
        },
        error: {
          [toCamelCase(`${serviceName}Service`)]: {
            status: HealthServiceStatusEnum.down,
          },
        },
        details: {
          [toCamelCase(`${serviceName}Service`)]: {
            status: HealthServiceStatusEnum.down,
            message: new ServiceUnavailableException(),
          },
        },
      };
    }
  }
}
