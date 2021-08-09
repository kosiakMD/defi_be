import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { toCamelCase } from 'src/utils/string';

import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthIndicator } from '@nestjs/terminus';

import { AccountService } from '../account/account.service';
import { IntegrationService } from '../integration/integration.service';
import { PricesService } from '../prices/prices.service';
import { Logger } from 'src/common/Logger/Logger.service';
import { HealthServiceStatusEnum, HealthStatusEnum } from 'src/common/enum';

// example
// interface HealthCheckResult {
//   status: HealthCheckStatus;
//   info: HealthIndicatorResult;
//   error?: HealthIndicatorResult;
//   details?: HealthIndicatorResult;
// }

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  private static async isHealthy(
    service: AccountService | IntegrationService | PricesService,
  ): Promise<HealthCheckResult> {
    try {
      return await service.isHealthy();
    } catch (e) {
      return {
        status: HealthStatusEnum.shuttingDown,
        info: {
          [toCamelCase(service.constructor.name)]: {
            status: HealthServiceStatusEnum.down,
          },
        },
        error: {
          [toCamelCase(service.constructor.name)]: {
            status: HealthServiceStatusEnum.down,
          },
        },
        details: {
          [toCamelCase(service.constructor.name)]: {
            status: HealthServiceStatusEnum.down,
          },
        },
      };
    }
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private accountService: AccountService,
    private integrationService: IntegrationService,
    private priceService: PricesService,
  ) {
    super();
  }

  async isAccountHealthy(): Promise<HealthCheckResult> {
    return ServiceHealthIndicator.isHealthy(this.accountService);
  }

  async isIntegrationHealthy(): Promise<HealthCheckResult> {
    return ServiceHealthIndicator.isHealthy(this.integrationService);
  }

  async isPriceHealthy(): Promise<HealthCheckResult> {
    return ServiceHealthIndicator.isHealthy(this.priceService);
  }
}
