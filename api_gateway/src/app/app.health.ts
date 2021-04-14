import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { IntegrationService } from '../integration/integration.service';
import { PricesService } from '../prices/prices.service';

// export interface Service {
//   service: string;
//   status: string;
// }

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  private static isHealthy(service): Promise<HealthIndicatorResult> {
    return service.isHealthy();
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private priceService: PricesService,
    private integrationService: IntegrationService,
  ) {
    super();
  }

  async isPriceHealthy(): Promise<HealthIndicatorResult> {
    return ServiceHealthIndicator.isHealthy(this.priceService);
  }

  async isIntegrationHealthy(): Promise<HealthIndicatorResult> {
    return ServiceHealthIndicator.isHealthy(this.integrationService);
  }
}
