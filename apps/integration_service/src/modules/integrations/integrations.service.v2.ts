import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { getChainByAbbr } from '../../common/utils/chain';

import { AbisEntity } from './entities/abis.entity';
import { AbiFetcherService } from './services/abi-fetcher.service';
import { AbisService } from './services/abis.service';
import { ContractsService } from './services/contracts.service';
import { ProjectsService } from './services/projects.service';
import { SettingsService } from './services/settings.service';
import { ChiefLoader } from './data/templates/chief/loader';
import { VaultLoader } from './data/templates/vault-loader';
import { collectCalls } from './data/templates/helpers';
import { CallGroup } from './data/templates/chief/config';
import { AbiItem } from 'web3-utils';

@Injectable()
export class IntegrationsServiceV2 {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly projectsService: ProjectsService,
    private readonly contractsService: ContractsService,
    private readonly abisService: AbisService,
    private readonly scanService: AbiFetcherService,
    private readonly vaultLoader: VaultLoader,
    private readonly chiefLoader: ChiefLoader,

    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async loadVaults({ chainCode, protocolCode, featureCode, contractAddress, contractAbi }) {
    contractAddress = contractAddress.toLowerCase();
    this.logger.log(`Loading vaults data for protocol "${protocolCode}" and chain "${chainCode}"`);

    const chain = getChainByAbbr(chainCode);
    const projectEntity = await this.projectsService.findByCode(protocolCode);
    if (!projectEntity) {
      throw new Error(`Project with code '${protocolCode}' not found.`);
    }

    const featureEntity = projectEntity.features.find((feature) => feature.name === featureCode);
    if (!featureEntity) {
      throw new Error(
        `Feature with code '${featureCode}' not found for '${protocolCode}' protocol`,
      );
    }

    let contractEntity = await this.contractsService.findOrSave(contractAddress, chain.id);
    if (!contractEntity.feature) {
      contractEntity = await this.contractsService.addFeatureRelation(
        contractEntity,
        featureEntity,
      );
    }

    const abiPlain = contractAbi;
    if (!contractEntity.abi && abiPlain) {
      const abiEntity: AbisEntity = await this.abisService.findOrSave(abiPlain);
      contractEntity = await this.contractsService.addAbiRelation(contractEntity, abiEntity);
    }

    if (!contractEntity.abi) {
      this.logger.debug(`Fetching abi for chain '${chainCode}' and contract '${contractAddress}'`);
      const settings = await this.settingsService.findOneByName('scans');

      const scanSettings = settings.value[chainCode];
      if (!scanSettings) {
        throw new Error('Not found setting for abi fetcher');
      }
      let scanAbi;
      try {
        scanAbi = await this.scanService.getAbi(scanSettings, contractAddress);
      } catch (e) {
        throw new Error(
          `Not possible to fetch abi for the contract ${contractAddress}, with configuration ${JSON.stringify(
            settings.value[chainCode],
          )}`,
        );
      }
      const abiEntity: AbisEntity = await this.abisService.findOrSave(scanAbi);
      contractEntity = await this.contractsService.addAbiRelation(contractEntity, abiEntity);
    }

    const blockchainCalls = collectCalls(this.chiefLoader.requiredForInitialLoad, contractEntity.abi.abi);

    if (blockchainCalls) {
      let features = await this.chiefLoader.collectFeatures(contractEntity.address, chain, blockchainCalls as Map<string, { call, abi }>);
      features = [features[0]]
      features = features.map((ft) => {
        const vaultCalls = this.chiefLoader.collectCallsPerVault(ft, contractEntity.abi.abi)
        const accountCalls = this.chiefLoader.collectCallsPerAccount(ft, contractEntity.abi.abi)
        return {
          ...ft,
          vaultCalls: vaultCalls,
          accountCalls: accountCalls,
        }
      });
      // const singleFeature = await this.chiefLoader.collectCallsPerVault(features[0], contractEntity.abi.abi);
      console.log(features)
    }

    // todo: if contract is not integrated, need to go to the next steps
    return contractEntity;
  }
}
