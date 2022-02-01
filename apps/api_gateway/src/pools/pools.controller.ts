import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import PoolDto from '@app/common/dto/Pool.dto';
import { Pool } from '@app/common/interfaces';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

const POOLS_CACHE_TIME_IN_SEC = 60;

@ApiTags('Pools')
@Controller('v1/pools')
export class PoolsController extends BaseService implements IBaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) protected cacheManager: Cache,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super(logger, httpService, configService);
  }

  url = this.buildUrl(
    this.configService.get<string>('INTEGRATION_SERVICE_HOST'),
    this.configService.get<string>('INTEGRATION_SERVICE_PORT'),
  );

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: PoolDto, isArray: true })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, type: HttpException })
  public async getPools(): Promise<Pool[]> {
    const cacheKey = 'pools';
    const logString = `Cache ${cacheKey} is `;
    let pools = await this.cacheManager.get<any[]>(cacheKey);

    if (!pools) {
      try {
        const poolsResponse = await this.httpService.get(this.url + 'v1/pools').toPromise();
        pools = poolsResponse.data;
        (async () => {
          await this.cacheManager.set<any[]>(cacheKey, pools, {
            ttl: POOLS_CACHE_TIME_IN_SEC,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        pools = await this.cacheManager.get<any[]>(cacheKey);
        if (!pools) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return pools;
  }
}
