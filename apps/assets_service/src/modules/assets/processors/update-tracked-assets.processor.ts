import { Job, Queue } from 'bull';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobName } from '../../../common/enum/job-name.enum';
import { JobCompleteStates } from '../../../common/enum/job-states.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { PriceSource } from '../../prices/types/price-source.type';
import { AssetsRepository } from '../repositories/assets.repository';
import { CoingeckoAssetsProvider } from '../services/tracked-assets/coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from '../services/tracked-assets/coinmarketcap-assets.provider';
import { TrackedAssetsProvider } from '../services/tracked-assets/tracked-assets.provider';

@Processor(QueueName.ASSETS)
export class UpdateTrackedAssetsProcessor {
  private readonly trackedAssetsProviders = new Array<TrackedAssetsProvider>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    private readonly assetRepository: AssetsRepository,
    coingekoProvider: CoingeckoAssetsProvider,
    coinmarketcapProvider: CoinmarketcapAssetsProvider,
  ) {
    this.trackedAssetsProviders.push(coingekoProvider, coinmarketcapProvider);
  }

  @Process(JobName.UPDATE_TRACKED_ASSETS)
  async handle(job: Job<PriceSource>) {
    try {
      const jobs = this.trackedAssetsProviders.map((provider) => this.handleProvider(provider));
      await Promise.all(jobs);

      await job.moveToCompleted(JobCompleteStates.SUCCESS);
    } catch (e) {
      this.logger.error(`Error processing tracked assets job: ${job.name}. Error: ${e.toString()}`);
      await job.moveToFailed({ message: e.toString() });
    }
  }

  private async handleProvider(provider: TrackedAssetsProvider) {
    try {
      this.logger.log(`Loading tracked assets by '${provider.name()}'`);
      const candidates = await provider.getTrackedAssetsCandidates();
      this.logger.log(`${candidates.length} assets provided by '${provider.name()}'`);

      for (const candidate of candidates) {
        await this.assetsQueue.add(JobName.ASSET_METADATA, {
          ...candidate,
          isTracked: true,
        });
      }
    } catch (e) {
      this.logger.error(
        `Error processing tracked assets provider ${provider.name()}. Error: ${e.toString()}`,
      );
    }
  }
}
