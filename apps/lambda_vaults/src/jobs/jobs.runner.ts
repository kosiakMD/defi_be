import { plainToClass } from 'class-transformer';
import { Repository } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../logger/logger.service';
import { IntegrationService } from '../microservices/integration.service';
import { TrackedVault } from '../store/tracked.vault.entity';
import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { concatStrings } from '../utils/string';
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

    const jobsPlaceholdersIntersection: Set<string> = new Set<string>();

    this.jobsRegistry.registry.forEach((_, v) => {
      if (integrationServiceJobsPlaceholdersSet.has(v)) {
        jobsPlaceholdersIntersection.add(v);
      }
    });

    const dbJobs: TrackedVault[] = await this.integrationJobsMappingRepository.find();
    const dbJobsItems: TrackedVaultItem[] = await this.integrationJobItemRepository.find();

    // set up objects to map in the other class to work with them simplier
    TrackedVaultsMap.add(dbJobs);
    TrackedVaultItemsMap.add(dbJobsItems);

    for (const placeholder of jobsPlaceholdersIntersection) {
      const existedDbJob: TrackedVault = TrackedVaultsMap.get(placeholder) as TrackedVault;
      if (existedDbJob) {
        this.logger.log(
          `found job to run [${placeholder}], isEnabled: [${existedDbJob.isEnabled}]`,
          JobsRunner.name,
        );
        if (existedDbJob.isEnabled) {
          await this.jobsRegistry.registry.get(placeholder).manageMapping();
          this.jobsToRun.set(placeholder, this.jobsRegistry.registry.get(placeholder));
        }
      }
    }
  }

  async update() {
    const jobsData = [];
    const promises = [];
    for (const placeholder of this.jobsToRun.keys()) {
      const job = this.jobsToRun.get(placeholder);
      promises.push(job.updateWithChainData());
      jobsData.push({
        chain: job.chain,
        protocolName: job.protocol,
        featureName: job.feature,
      });
    }

    const dataToNotify: NotifyPayloadFeaturesDto[] = [];
    const executedPromises = await Promise.allSettled(promises);
    jobsData.forEach((d, i) => {
      if (executedPromises[i].status === 'fulfilled') {
        dataToNotify.push(
          plainToClass(NotifyPayloadFeaturesDto, {
            ...d,
            items: executedPromises[i]['value'],
          }),
        );
      } else {
        this.logger.error(
          `error during job mapping update [${concatStrings(
            d.chain,
            d.protocolName,
            d.featureName,
          )}], [${executedPromises[i]['reason']}]`,
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
    return jobPlaceholdersSet;
  }
}
