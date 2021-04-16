import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthIndicator } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { IntegrationService } from '../integration/integration.service';
import { PricesService } from '../prices/prices.service';

enum StatusEnum {
  up = 'up',
  down = 'down',
}

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
        status: 'shutting_down',
        info: {
          [service.constructor.name]: {
            status: StatusEnum.down,
          },
        },
        error: {
          [service.constructor.name]: {
            status: StatusEnum.down,
          },
        },
        details: {
          [service.constructor.name]: {
            status: StatusEnum.down,
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
