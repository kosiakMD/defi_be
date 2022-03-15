import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AbiItem } from 'web3-utils';
import { Logger } from '@app/common';

import { getChainByAbbr } from '../../common/utils/chain';

import { AbisEntity } from './entities/abis.entity';
import { AbiFetcherService } from './services/abi-fetcher.service';
import { AbisService } from './services/abis.service';
import { ContractsService } from './services/contracts.service';
import { ProjectsService } from './services/projects.service';
import { SettingsService } from './services/settings.service';
import { ModuleRef } from '@nestjs/core';
import { getLoadersList } from './fr/helpers';

@Injectable()
export class IntegrationsServiceV2 {
  private loaders: any[];
  constructor(
    private readonly settingsService: SettingsService,
    private readonly projectsService: ProjectsService,
    private readonly contractsService: ContractsService,
    private readonly abisService: AbisService,
    private readonly scanService: AbiFetcherService,
    private moduleRef: ModuleRef,

    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.loaders = getLoadersList();
  }

  async loadVaults({ chainCode, protocolCode, contractAddress, contractAbi }) {
    contractAddress = contractAddress.toLowerCase();
    this.logger.log(`Loading vaults data for protocol "${protocolCode}" and chain "${chainCode}"`);

    const chain = getChainByAbbr(chainCode);
    const projectEntity = await this.projectsService.findByCode(protocolCode);
    if (!projectEntity) {
      throw new Error(`Project with code '${protocolCode}' not found.`);
    }

    let contractEntity = await this.contractsService.findOrSave(contractAddress, chain.id);
    if (!contractEntity.project) {
      contractEntity = await this.contractsService.addProjectRelation(
        contractEntity,
        projectEntity,
      );
    }

    const abiPlain: AbiItem[] = contractAbi;
    if (!contractEntity.abi && abiPlain && abiPlain.length > 0) {
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



    let implementation;
    for (let i = 0; i < this.loaders.length; i++) {
      try {
        // @ts-ignore
        implementation = new this.loaders[i](this.moduleRef, {
          address: contractEntity.address,
          abi: contractEntity.abi.abi,
          chain: chain,
          metadata: {}
        });
      } catch (ignored) {}
    }

    if (implementation) {
      const vaults = await implementation.loadVaults(implementation, chain);
      contractEntity.isIntegrated = true;
      await this.contractsService.repository.save(contractEntity);

      const accountBalances = await implementation.loadAccountData(vaults, ['0x60dE7F647dF2448eF17b9E0123411724De6e373D', '0x4e796EA3819b6d59C53554B35DBD32C0111936Ce']);
      console.log(vaults)
      console.log(accountBalances)
    }

    return contractEntity;
  }
}

// next steps:
// load all existing contracts in the database
// make update of vaults
// update on chain periodical data
// implement account data handling
