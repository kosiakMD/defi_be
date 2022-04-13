import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { PriceSourceEntity } from './entities/price-sources.entity';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Injectable()
export class PriceJobEmitter {
  constructor(
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
    @InjectQueue('assets') private assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleUpdateFromDatabaseCron() {
    this.logger.log('Called every minute, broadcast assets price jobs');
    await this.broadcastAssetsPriceJobs();
  }

  private async broadcastAssetsPriceJobs(): Promise<void> {
    const priceSources = await this.priceSourceRepository.find({
      where: { enabled: true },
    });
    /**
     * for each price source:
     * - add price jobs including strategy config and sourseId to be able to process it on job consumer
     */
    priceSources.forEach(async (priceSource: PriceSourceEntity) => {
      const { config, id: sourceId, name, type: strategy } = priceSource;
      this.logger.debug(`Assets price job for ${name}`);

      const priceJobData = {
        config,
        sourceId,
        strategy,
      };
      this.assetsQueue.add('prices', priceJobData);
    });
  }
}
