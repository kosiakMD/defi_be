import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import VaultDto from '@app/common/dto/Vault.dto';
import { Vault } from '@app/common/interfaces';

import { IntegrationService } from '../integration/integration.service';

// TODO: can be null as updated each time
const VAULTS_CACHE_TIME = 60; // 1 min

@ApiTags('Vaults')
@Controller('v1/vaults')
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
