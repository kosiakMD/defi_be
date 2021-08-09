import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { IntegrationService } from '../integration/integration.service';
import VaultDto from 'src/common/DTO/Vault.dto';
import { Logger } from 'src/common/Logger/Logger.service';
import { Vault } from 'src/common/interfaces';

// TODO: can be null as updated each time
const VAULTS_CACHE_TIME = 60; // 1 min

@ApiTags('Vaults')
@Controller('vaults')
export class VaultsController {
  constructor(
    private integrationService: IntegrationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: VaultDto, isArray: true })
  @ApiResponse({ status: 500, type: HttpException })
  public async getVaults(): Promise<Vault[]> {
    this.logger.time('getVaults');
    const vaults = await Promise.any([this.readVaults(), this.fetchVaults()]);
    this.logger.timeEnd('getVaults');
    return vaults;
  }

  private async readVaults(): Promise<Vault[]> {
    const vaults = await this.cacheManager.get<Vault[]>('vaults');
    if (vaults) {
      return vaults;
    } else {
      throw new Error('empty');
    }
  }

  private async fetchVaults(): Promise<Vault[]> {
    const vaults = await this.integrationService.getVaults();
    // postponed save in async queue
    this.cacheManager.set<Vault[]>('vaults', vaults, { ttl: VAULTS_CACHE_TIME });
    return vaults;
  }
}
