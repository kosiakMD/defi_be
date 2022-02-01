import { Cache } from 'cache-manager';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { AbisEntity } from './entities/abis.entity';
import { AbisService } from './services/abis.service';
import { ContractsService } from './services/contracts.service';
import { ScanService } from './services/scan.service';
import { SettingsService } from './services/settings.service';
import { ProjectsService } from './services/projects.service';

@Injectable()
export class IntegrationsServiceV2 {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly projectsService: ProjectsService,
    private readonly contractsService: ContractsService,
    private readonly abisService: AbisService,
    private readonly scanService: ScanService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async loadVaults(chainCode, protocolCode) {
    this.logger.log(`Loading vaults data for protocol "${protocolCode}" and chain "${chainCode}"`);

    const contractAddress = '0xbf513ace2abdc69d38ee847effdaa1901808c31c';
    const chainId = 4;
    const projectEntity = await this.projectsService.findByCode(protocolCode);
    if (!projectEntity) {
      throw new Error(`Project with code '${protocolCode}' not found.`);
    }

    let contractEntity = await this.contractsService.findOrSave(contractAddress, chainId);
    if (contractEntity && contractEntity.abi) {
      return contractEntity;
    }

    const settings = await this.settingsService.findOneByName('scans');
    // todo: add validation if not exists
    const scanUrl = settings.value[chainCode];

    const abiPlain: AbiItem[] = await this.scanService.getAbi(scanUrl, contractAddress);
    const abiEntity: AbisEntity = await this.abisService.findOrSave(abiPlain);

    contractEntity = await this.contractsService.addAbiRelation(contractEntity, abiEntity);
    return contractEntity;
  }
}
