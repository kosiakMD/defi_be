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
import { ChiefLoader } from './data/templates/chief/loader';
import { VaultLoader } from './data/templates/vault-loader';
import { MasterchiefLoader } from './fr/chief/masterchief.loader';
import { dirname } from "path";
import fs from "fs";
import { ChainConfigurable } from './fr/chain-configurable';
import { SingleChiefLoader } from './fr/singlechief/singlechief.loader';

@Injectable()
export class IntegrationsServiceV2 {
  private readonly registry = [];
  constructor(
    private readonly settingsService: SettingsService,
    private readonly projectsService: ProjectsService,
    private readonly contractsService: ContractsService,
    private readonly abisService: AbisService,
    private readonly scanService: AbiFetcherService,
    private readonly vaultLoader: VaultLoader,
    private readonly chiefLoader: ChiefLoader,
    private readonly masterchiefLoader: MasterchiefLoader,
    private readonly singleChiefLoader: SingleChiefLoader,

    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const farmClientsDir = `${dirname(__filename)}/fr`;

    fs
      .readdirSync(farmClientsDir, { withFileTypes: true })
      .forEach((direct) => {
        if (!direct.isDirectory()) return;
        const farmClientsSubdir = `${farmClientsDir}/${direct.name}`;

        fs
          .readdirSync(farmClientsSubdir)
          .forEach((filename) => {
            if (['.ts', '.js'].indexOf(filename.slice(-3)) === -1) return;

            const imported = require(`${farmClientsSubdir}/${filename}`);
            Object.values(imported).forEach((obj) => {
              if (!((<any>obj).prototype instanceof ChainConfigurable)) {
                return;
              }

              this.registry.push(obj)
            });
          });
      });
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
    for (let i = 0; i < this.registry.length; i++) {
      try {
        implementation = new this.registry[i](contractEntity.address, contractEntity.abi.abi);
      } catch (ignored) {}
    }
    if (implementation) {
      const vaults = await this.singleChiefLoader.loadVaults(implementation, chain);
      contractEntity.isIntegrated = true;
      contractEntity.implementationId = implementation.implementationId;
      await this.contractsService.repository.save(contractEntity);
      console.log(vaults)
    }
    // todo: if contract is not integrated, need to go to the next steps
    return contractEntity;
  }
}

// next steps:
// load all existing contracts in the database
// make update of vaults
// update on chain periodical data
// implement account data handling
