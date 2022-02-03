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
import { VaultLoaderDemo } from './services/vault-loader-demo';
import { isChief } from './data/config';
import { ChiefLoader } from './data/chief-loader';

@Injectable()
export class IntegrationsServiceV2 {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly projectsService: ProjectsService,
    private readonly contractsService: ContractsService,
    private readonly abisService: AbisService,
    private readonly scanService: AbiFetcherService,
    private readonly vaultLoader: VaultLoaderDemo,
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

    const isChiefs = isChief(contractEntity.address, contractEntity.abi.abi);
    if (isChiefs) {
      const features = await this.chiefLoader.grabAllPools(contractEntity.address, contractEntity.abi.abi, chain);
    }

    // todo: if contract is not integrated, need to go to the next steps
    return contractEntity;
  }
}
