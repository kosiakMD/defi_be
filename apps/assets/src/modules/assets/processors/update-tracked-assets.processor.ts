import { Job, Queue } from 'bull';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { formatError } from '@app/common/utils';

import { AssetJobName } from '../../../common/enum/job-name.enum';
import { JobPriority } from '../../../common/enum/job-priority.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { PriceSource } from '../../prices/types/price-source.type';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { CardanoTokenRegistryProvider } from '../services/tracked-assets/cardano-token-registry.provider';
import { CoingeckoAssetsProvider } from '../services/tracked-assets/coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from '../services/tracked-assets/coinmarketcap-assets.provider';
import { EVMCoinProvider } from '../services/tracked-assets/evm-coin.provider';
import { TrackedAssetsProvider } from '../services/tracked-assets/tracked-assets.provider';

@Processor(QueueName.ASSETS)
export class UpdateTrackedAssetsProcessor {
  private readonly trackedAssetsProviders = new Array<TrackedAssetsProvider>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    private readonly assetsRepository: AssetsCachedRepository,
    coingekoProvider: CoingeckoAssetsProvider,
    coinmarketcapProvider: CoinmarketcapAssetsProvider,
    evmCoinProvider: EVMCoinProvider,
    cardanoTokenRegistryProvider: CardanoTokenRegistryProvider,
  ) {
    this.trackedAssetsProviders.push(
      coingekoProvider,
      coinmarketcapProvider,
      evmCoinProvider,
      cardanoTokenRegistryProvider,
    );
  }

  @Process(AssetJobName.UPDATE_TRACKED_ASSETS)
  async handle(job: Job<PriceSource>) {
    try {
      await Promise.all(
        this.trackedAssetsProviders.map((provider) => this.handleProvider(provider)),
      );
    } catch (e) {
      this.logger.error(`Error processing tracked assets job: ${job.name}`, e);
      throw e;
    }
  }

  private async handleProvider(provider: TrackedAssetsProvider) {
    try {
      this.logger.log(`Loading tracked assets by '${provider.name()}'`);
      const candidates = await provider.getTrackedAssetsCandidates();
      this.logger.log(`${candidates.length} assets provided by '${provider.name()}'`);

      for (const candidate of candidates) {
        await this.assetsQueue.add(
          AssetJobName.ASSET_METADATA,
          {
            ...candidate,
            isTracked: true,
          },
          {
            // NOTE: This should prevent process asset jobs duplications
            jobId: `process-asset:${candidate.chainId}-${candidate.address}`,
            priority: JobPriority.LOW,
          },
        );
      }
    } catch (e) {
      this.logger.error({
        message: `Error processing tracked assets provider ${provider.name()}`,
        error: formatError(e),
      });
    }
  }
}
