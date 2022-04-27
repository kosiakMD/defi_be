import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../logger/logger.service';
import { IntegrationService } from '../microservices/integration.service';

@Injectable()
export class JobsV3Runner {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly integrationService: IntegrationService,
  ) {}

  async update() {
    try {
      this.logger.log('Sync v3 opportunities starting...', this.constructor.name);
      const syncResult = await this.integrationService.syncV3Opportunities();
      this.logger.log('Sync v3 opportunities completed', this.constructor.name);
      return syncResult;
    } catch (e) {
      this.logger.error('Sync v3 opportunities completed with ERROR', this.constructor.name);
      this.logger.error(e);
    }
  }
}
