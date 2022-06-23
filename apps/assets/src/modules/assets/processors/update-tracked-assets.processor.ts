import { Job, Queue } from 'bull';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { formatError } from '@app/common/utils';

import { AssetJobName } from '../../../common/enum/job-name.enum';
import { JobPriority } from '../../../common/enum/job-priority.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { BullQueueService } from '../../../common/services/bull-queue.service';

import { PriceSource } from '../../prices/types/price-source.type';
import { trackedAssetsProviders } from '../services/tracked-assets/registry';
import { TrackedAssetsProvider } from '../services/tracked-assets/tracked-assets.provider';
import { getAssetProcessJobId } from '../utils/jobs.helper';

/*
 Refreshes tracked assets based on defined strategies.
 Should be executed daily.
 * */
@Processor(QueueName.ASSETS)
export class UpdateTrackedAssetsProcessor implements OnModuleInit {
  private readonly trackedAssetsProviders = new Array<TrackedAssetsProvider>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    private readonly moduleRef: ModuleRef,
    private readonly bullQueueService: BullQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const provider of trackedAssetsProviders) {
      this.trackedAssetsProviders.push(await this.moduleRef.resolve(provider));
    }
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
      await this.bullQueueService.cleanAllFailedJobs(this.assetsQueue);
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
            jobId: getAssetProcessJobId(candidate),
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
