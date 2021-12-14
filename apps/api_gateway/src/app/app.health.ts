import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthIndicator } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { HealthServiceStatusEnum, HealthStatusEnum } from '@app/common/enum';
import { toCamelCase } from '@app/common/utils';

import { AccountService } from '../account/account.service';
import { IntegrationService } from '../integration/integration.service';
import { PricesService } from '../prices/prices.service';

// example
// interface HealthCheckResult {
//   status: HealthCheckStatus;
//   info: HealthIndicatorResult;
//   error?: HealthIndicatorResult;
//   details?: HealthIndicatorResult;
// }

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private accountService: AccountService,
    private integrationService: IntegrationService,
    private priceService: PricesService,
  ) {
    super();
  }

  private async isHealthy(
    service: AccountService | IntegrationService | PricesService,
  ): Promise<HealthCheckResult> {
    try {
      return await service.isHealthy();
    } catch (e) {
      this.logger.error(e);
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

  async isAccountHealthy(): Promise<HealthCheckResult> {
    return this.isHealthy(this.accountService);
  }

  async isIntegrationHealthy(): Promise<HealthCheckResult> {
    return this.isHealthy(this.integrationService);
  }

  async isPriceHealthy(): Promise<HealthCheckResult> {
    return this.isHealthy(this.priceService);
  }
}
