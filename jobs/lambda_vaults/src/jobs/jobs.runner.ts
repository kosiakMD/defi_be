import { plainToClass } from 'class-transformer';
import { Repository } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { concatStrings } from '@app/common/utils';

import { Logger } from '../logger/logger.service';
import { IntegrationService } from '../microservices/integration.service';
import { TrackedVault } from '../store/tracked.vault.entity';
import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { chainIdsMap } from '../utils/constants';
import { TrackedVaultItemsMap } from './data/tracked.vault.items.map';
import { TrackedVaultsMap } from './data/tracked.vaults.map';
import { NotifyPayloadFeaturesDto, ProtocolsResponseData } from './integrations.dto';
import { JobInterface } from './job.interface';
import { JobsRegistry } from './jobs.registry';

@Injectable()
export class JobsRunner {
  private jobsToRun: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly integrationService: IntegrationService,
    private readonly jobsRegistry: JobsRegistry,
    @InjectRepository(TrackedVault)
    private integrationJobsMappingRepository: Repository<TrackedVault>,
    @InjectRepository(TrackedVaultItem)
    private integrationJobItemRepository: Repository<TrackedVaultItem>,
  ) {}

  async initialize() {
    const integrationServiceJobsPlaceholdersSet: Set<string> =
      await this.getIntegrationServiceConfiguration();

    // All the Registered Jobs that also exist in the database
    const jobsPlaceholdersIntersection: Set<string> = new Set<string>();

    this.jobsRegistry.registry.forEach((_, v) => {
      if (integrationServiceJobsPlaceholdersSet.has(v)) {
        if (chainIdsMap.get(v.split('_')[0])) jobsPlaceholdersIntersection.add(v);
      } else {
        this.logger.warn(`[${v}] was registered manually but is not running`);
      }
    });

    const dbJobs = await this.integrationJobsMappingRepository.find();
    const dbJobsItems = await this.integrationJobItemRepository.find();

    // set up objects to map in the other class to work with them simplier
    TrackedVaultsMap.add(dbJobs);
    TrackedVaultItemsMap.add(dbJobsItems);

    for (const placeholder of jobsPlaceholdersIntersection) {
      const existedDbJob = TrackedVaultsMap.get(placeholder) as TrackedVault;
      if (!existedDbJob) {
        this.logger.warn(
          `[${placeholder}] has been registered but is missing the row in the database. Skipping.`,
        );
        continue;
      }

      this.logger.log(
        `found job to run [${placeholder}], isEnabled: [${existedDbJob.isEnabled}]`,
        JobsRunner.name,
      );

      if (existedDbJob.isEnabled) {
        await this.jobsRegistry.registry.get(placeholder).manageMapping();
        this.jobsToRun.set(placeholder, this.jobsRegistry.registry.get(placeholder));
      }
    }

    // TODO: add a way to initialize a new job so that we don't have to manually add/update it in the database
  }

  async update() {
    const jobsDataMap = new Map<number, Partial<NotifyPayloadFeaturesDto>[]>();

    const sortedJobs = new Map<number, JobInterface[]>();
    for (const placeholder of this.jobsToRun.keys()) {
      const job = this.jobsToRun.get(placeholder);
      const check = sortedJobs.get(job.chain);
      if (check) {
        check.push(job);
      } else {
        sortedJobs.set(job.chain, [job]);
      }
    }

    const promises: Promise<{
      chain: number;
      results: NotifySupportedFeature[];
    }>[] = Array.from(sortedJobs.entries()).map(async ([chain, jobs]) => {
      const results = [];
      jobsDataMap.set(chain, []);
      for (const job of jobs) {
        try {
          const resultJob = await job.updateWithChainData();

          const jobData = {
            chain: job.chain,
            protocolName: job.protocol,
            featureName: job.feature,
          };

          const check = jobsDataMap.get(chain);
          check.push(jobData);
          results.push(resultJob);
          this.logger.log(
            `job mapping updated [${job.placeholder}] (${resultJob.length} pools)`,
            JobsRunner.name,
          );
        } catch (e) {
          this.logger.error(
            `error during job mapping update [${job.placeholder}], [${e}]`,
            e.stack,
            JobsRunner.name,
          );
        }
      }

      return { chain, results };
    });

    const dataToNotify: NotifyPayloadFeaturesDto[] = [];
    const executedPromises = await Promise.allSettled(promises);
    executedPromises.forEach((ex) => {
      if (ex.status === 'fulfilled' && ex.value?.results?.length > 0) {
        const { chain, results } = ex['value'];
        const jobInfo = jobsDataMap.get(chain);
        for (const index in results) {
          dataToNotify.push(
            plainToClass(NotifyPayloadFeaturesDto, {
              ...jobInfo[index],
              items: results[index],
            }),
          );
        }
      } else {
        this.logger.error(
          `error during jobs mapping update for chain [${ex['value']['chain']}]`,
          '',
          JobsRunner.name,
        );
      }
    });

    try {
      await this.integrationService.notifyWithLiquidityPoolsData(dataToNotify);
      this.logger.log(`features notified [${dataToNotify.length}]`, JobsRunner.name);
    } catch (e) {
      this.logger.error(`error during integration service notification`, '', JobsRunner.name);
    }
  }

  private async getIntegrationServiceConfiguration() {
    const integrationProtocols: ProtocolsResponseData =
      await this.integrationService.getProtocols();
    const jobPlaceholdersSet: Set<string> = new Set<string>();
    integrationProtocols.data.forEach((ip) => {
      ip.features.forEach((f) => {
        f.list.forEach((feature) => {
          jobPlaceholdersSet.add(concatStrings(f.chain.id, ip.name, feature));
        });
      });
    });

    jobPlaceholdersSet.add(`${ChainIdEnum.sol}_${ProtocolNameEnum.orca}_${FeatureEnum.staking}`);
    jobPlaceholdersSet.add(`${ChainIdEnum.sol}_${ProtocolNameEnum.orca}_${FeatureEnum.pools}`);
    jobPlaceholdersSet.add(
      `${ChainIdEnum.cardano}_${ProtocolNameEnum.minswap}_${FeatureEnum.pools}`,
    );
    jobPlaceholdersSet.add(
      `${ChainIdEnum.cardano}_${ProtocolNameEnum.sundaeswap}_${FeatureEnum.pools}`,
    );
    jobPlaceholdersSet.add(
      `${ChainIdEnum.cardano}_${ProtocolNameEnum.wingriders}_${FeatureEnum.pools}`,
    );
    jobPlaceholdersSet.add(`${ChainIdEnum.sol}_${ProtocolNameEnum.marinade}_${FeatureEnum.pools}`);
    jobPlaceholdersSet.add(
      `${ChainIdEnum.osmosis}_${ProtocolNameEnum.osmosis}_${FeatureEnum.pools}`,
    );
    jobPlaceholdersSet.add(
      `${ChainIdEnum.near}_${ProtocolNameEnum.trisolaris}_${FeatureEnum.pools}`,
    );
    jobPlaceholdersSet.add(
      `${ChainIdEnum.near}_${ProtocolNameEnum.trisolaris}_${FeatureEnum.staking}`,
    );
    jobPlaceholdersSet.add(`${ChainIdEnum.terra}_${ProtocolNameEnum.anchor}_${FeatureEnum.pools}`);
    jobPlaceholdersSet.add(
      `${ChainIdEnum.terra}_${ProtocolNameEnum.anchor}_${FeatureEnum.staking}`,
    );
    jobPlaceholdersSet.add(
      `${ChainIdEnum.terra}_${ProtocolNameEnum.astroport}_${FeatureEnum.pools}`,
    );
    jobPlaceholdersSet.add(
      `${ChainIdEnum.terra}_${ProtocolNameEnum.astroport}_${FeatureEnum.staking}`,
    );
    return jobPlaceholdersSet;
  }
}
