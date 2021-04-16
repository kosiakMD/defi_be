import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { IntegrationService } from '../integration/integration.service';
import { PricesService } from '../prices/prices.service';

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  private static isHealthy(service): Promise<HealthIndicatorResult> {
    return service.isHealthy();
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private accountService: AccountService,
    private integrationService: IntegrationService,
    private priceService: PricesService,
  ) {
    super();
  }

  async isAccountHealthy(): Promise<HealthIndicatorResult> {
    return ServiceHealthIndicator.isHealthy(this.accountService);
  }
  async isIntegrationHealthy(): Promise<HealthIndicatorResult> {
    return ServiceHealthIndicator.isHealthy(this.integrationService);
  }

  async isPriceHealthy(): Promise<HealthIndicatorResult> {
    return ServiceHealthIndicator.isHealthy(this.priceService);
  }
}
