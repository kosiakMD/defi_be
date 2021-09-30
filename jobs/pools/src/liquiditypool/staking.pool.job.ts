import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject } from '@nestjs/common';

import { Web3Provider } from '../chain/web3.provider';
import { Logger } from '../logger/logger.service';
import { IntegrationService } from '../microservices/integration.service';
import { getJobPlaceholder } from '../utils/string';
import { IntegrationJob } from './dto/db.dto';
import { IntegrationJobsRepository } from './integration.jobs.repository';
import { NotifyPayloadFeaturesDto, ProtocolsResponseData } from './integrations.dto';
import { StakingJobInterface } from './staking.job.interface';
import { StakingPoolJobsFactory } from './staking.pool.jobs.factory';

export class StakingPoolJob {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly integrationJobsRepository: IntegrationJobsRepository,
    private readonly integrationService: IntegrationService,
    private readonly stakingPoolJobsFactory: StakingPoolJobsFactory,
    private readonly web3Provider: Web3Provider,
  ) {}

  async collectProtocolsAvailable(): Promise<void> {
    const integrationServiceConfiguration: Set<string> =
      await this.getIntegrationServiceConfiguration();
    const integratedJobs: Map<string, StakingJobInterface> =
      this.stakingPoolJobsFactory.getJobsIntegrated();
    const dbJobsConfiguration: Map<string, IntegrationJob> = await this.getDbPoolsConfiguration();

    const foundJobsPlaceholders: Set<string> = new Set<string>();

    // now need to find what exactly jobs needs to be executed:
    integrationServiceConfiguration.forEach((placeholder) => {
      const existedJob: StakingJobInterface = integratedJobs.get(placeholder);
      if (existedJob) {
        existedJob.setConfiguration(dbJobsConfiguration.get(placeholder));
        this.logger.log(
          `found job to proceed [${placeholder}], isEnabled: [${existedJob.isEnabled()}]`,
          StakingPoolJob.name,
        );
        if (existedJob.isEnabled()) {
          foundJobsPlaceholders.add(placeholder);
        }
      }
    });

    // keep only enabled jobs in map
    for (const placeholder of integratedJobs.keys()) {
      if (!foundJobsPlaceholders.has(placeholder)) {
        integratedJobs.delete(placeholder);
      }
    }

    for (const placeholder of integratedJobs.keys()) {
      try {
        await integratedJobs.get(placeholder).updateTrackedStakingPools();
      } catch (e: any) {
        this.logger.error(`error during tracked staking pools update [${placeholder}], ${e}`);
      }
    }

    const featuresToNotify: NotifyPayloadFeaturesDto[] = [];
    for (const placeholder of integratedJobs.keys()) {
      const job = integratedJobs.get(placeholder);
      const updatedStakingFeatures = await job.updateWithExternalData();
      featuresToNotify.push({
        chain: job.chain,
        protocolName: job.protocol,
        featureName: job.feature,
        items: updatedStakingFeatures,
      });
    }

    try {
      await this.integrationService.notifyWithLiquidityPoolsData(featuresToNotify);
      this.logger.log(`features notified [${featuresToNotify.length}]`, StakingPoolJob.name);
    } catch (e) {
      this.logger.error(`error during integration service notification`, '', StakingPoolJob.name);
    }
  }

  async getDbPoolsConfiguration(): Promise<Map<string, IntegrationJob>> {
    const availableDbSettings: IntegrationJob[] =
      await this.integrationJobsRepository.getAvailablePools();
    const availableDbSettingMap: Map<string, IntegrationJob> = new Map<string, IntegrationJob>();
    availableDbSettings.forEach((ij) => {
      availableDbSettingMap.set(getJobPlaceholder(ij.chainId, ij.feature, ij.protocol), ij);
    });
    return availableDbSettingMap;
  }

  async getIntegrationServiceConfiguration(): Promise<Set<string>> {
    const integrationProtocols: ProtocolsResponseData =
      await this.integrationService.getProtocols();
    const integrationProtocolsSet: Set<string> = new Set<string>();
    integrationProtocols.data.map((ip) => {
      ip.features.map((f) => {
        f.list.map((feature) => {
          integrationProtocolsSet.add(getJobPlaceholder(f.chain.id, feature, ip.name));
        });
      });
    });
    integrationProtocolsSet.add('2_PancakeV2_staking');
    return integrationProtocolsSet;
  }
}
