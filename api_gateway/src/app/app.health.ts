import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

export interface Service {
  service: string;
  status: string;
}

@Injectable()
export class ServiceHealthIndicator extends HealthIndicator {
  private services: Service[] = [
    { service: 'Account', status: 'ok' },
    { service: 'Price', status: 'down' },
  ];

  // TODO: implement all Services Health Checks
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const services = this.services.filter((service) => service.status !== 'ok');
    const isHealthy = services.length === 0;
    const result = this.getStatus(key, isHealthy, {
      services: {
        count: services.length,
        all: [...services],
      },
    });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Services check failed', result);
  }
}
