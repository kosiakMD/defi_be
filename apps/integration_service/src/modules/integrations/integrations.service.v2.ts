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
import { LoaderAbstract } from './fr/loader.abstract';

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
          confirmChainConfiguration: true,
          address: contractEntity.address,
          abi: contractEntity.abi.abi,
          chain: chain,
          metadata: {
            protocol: protocolCode
          }
        });
      } catch (ignored) {}
    }

    if (implementation) {
      const vaults = await implementation.loadVaults(implementation, chain);
      const id = implementation.getImplementationId();
      contractEntity.isIntegrated = true;
      contractEntity.implementationId = id;
      await this.cache.set(implementation.getImplementationId(), vaults, { ttl: 0 });
      await this.contractsService.repository.save(contractEntity);
      console.log(implementation.getImplementationId())
      console.log(vaults)
    }

    return contractEntity;
  }

  async loadAccountsData({ chainCode, protocolCode, addresses }) {
    const projectEntity = await this.projectsService.findByCode(protocolCode);

    const cacheIds = new Set<string>();
    projectEntity.contracts.forEach((c) => {
      if (c.isIntegrated && c.chainId == getChainByAbbr(chainCode).id && c.implementationId) {
        cacheIds.add(c.implementationId);
      }
    });


    for (const cacheId of cacheIds.values()) {
      const loaderName = cacheId.split(':')[2];
      const address = cacheId.split(':')[3];
      const loader = this.loaders.find((l) => l.name === loaderName);
      const loaderInst = new loader(this.moduleRef, {
        chain: getChainByAbbr(chainCode),
        address: address,
        metadata: {
          protocol: protocolCode
        }
      });
      const accountsData = await loaderInst.loadAccountData(addresses);
      console.log(accountsData)
    }
  }
}

// todo:
// make update of vaults
// update on chain periodical data
