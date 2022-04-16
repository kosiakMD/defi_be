import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { VaultDto } from '@app/common';
import { Vault } from '@app/common';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

const VAULTS_CACHE_TIME_IN_SEC = 60;

@ApiTags('Vaults')
@Controller('v1/vaults')
export class VaultsController extends BaseService implements IBaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
    @Inject(CACHE_MANAGER) protected cacheManager: Cache,
  ) {
    super(logger, httpService, configService);
  }

  url = this.buildUrl(
    this.configService.get<string>('INTEGRATION_SERVICE_HOST'),
    this.configService.get<string>('INTEGRATION_SERVICE_PORT'),
  );

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: VaultDto, isArray: true })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, type: HttpException })
  public async getVaults(): Promise<Vault[]> {
    return await Promise.any([this.readVaults(), this.fetchVaults()]);
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
    const vaults = this.requestProxy(this.url + 'v1/vaults', 'GET');
    await this.cacheManager.set<any>('vaults', vaults, { ttl: VAULTS_CACHE_TIME_IN_SEC });
    return vaults;
  }
}
