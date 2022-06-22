import { Job, Queue } from 'bull';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { AssetJobName } from '../../../common/enum/job-name.enum';
import { JobPriority } from '../../../common/enum/job-priority.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { PriceSource } from '../../prices/types/price-source.type';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { getAssetProcessJobId } from '../utils/jobs.helper';

/*
 Force reprocesses all assets with missing icons
 Executed on demand.
 * */
@Processor(QueueName.ASSETS)
export class ReprocessNoIconAssetsProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    private readonly assetsRepository: AssetsCachedRepository,
  ) {}

  @Process(AssetJobName.REPROCESS_ASSETS_WITHOUT_ICONS)
  async handle(job: Job<PriceSource>) {
    try {
      const assets = await this.assetsRepository.findTrackedAssetsWithoutIcon();
      this.logger.log(`${assets.length} assets without icon found`);

      const promises = assets.map(async ({ chainId, address }) => {
        await this.assetsQueue.add(
          AssetJobName.ASSET_METADATA,
          {
            chainId,
            address,
            forceUpdate: true,
          },
          {
            // NOTE: This should prevent process asset jobs duplications
            jobId: getAssetProcessJobId({ chainId, address }),
            priority: JobPriority.LOW,
          },
        );
      });

      await Promise.all(promises);
    } catch (e) {
      this.logger.error(`Error re-processing assets without icons: ${job.name}`, e);
      throw e;
    }
  }
}
