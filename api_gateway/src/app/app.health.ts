import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { IntegrationService } from '../integration/integration.service';
import { PricesService } from '../prices/prices.service';

export interface Service {
  service: string;
  status: string;
}

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  private services: Service[] = [
    { service: 'Gateway', status: 'ok' },
    { service: 'Account', status: 'ok' },
    { service: 'Price', status: 'down' },
    { service: 'Integrations', status: 'down' },
  ];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private priceService: PricesService,
    private integrationService: IntegrationService,
  ) {
    super();
  }
  // TODO: implement all Services Health Checks
  async isPriceHealthy(): Promise<HealthIndicatorResult> {
    const result = await this.priceService.isHealthy();
    this.logger.log(result, 'priceService.isHealthy');
    const isHealthy = result.status;
    // const result = {
    //   'Price Service': result,
    // };
    // const services = this.services.filter((service) => service.status !== 'ok');
    // const isHealthy = services.length === 0;
    // const result = this.getStatus(key, isHealthy, {
    //   services: {
    //     count: services.length,
    //     all: [...services],
    //   },
    // });
    //
    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Services check failed', result);
  }
}
