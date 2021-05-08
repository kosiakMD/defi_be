import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import PoolDto from '../common/DTO/Pool.dto';
import { Logger } from '../common/Logger/Logger.service';
import { Pool } from '../common/interfaces';
import { IntegrationService } from '../integration/integration.service';

// TODO: can be null as updated each time
const POOLS_CACHE_TIME = 60; // 1 min

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private integrationService: IntegrationService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: PoolDto, isArray: true })
  @ApiResponse({ status: 500, type: HttpException })
  public async getPools(): Promise<Pool[]> {
    const cacheKey = 'pools';
    const logString = `Cache ${cacheKey} is `;
    let pools = await this.cacheManager.get<any[]>(cacheKey);

    if (!pools) {
      try {
        this.logger.debug(logString + 'fetching');

        this.logger.time('getPools');
        // const pools = await Promise.any([this.readPools(), this.fetchPools()]);
        pools = await this.integrationService.getPools();
        this.logger.timeEnd('getPools');
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any[]>(cacheKey, pools, {
            ttl: POOLS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
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

  // TODO: delete
  private async readPools(): Promise<Pool[]> {
    const pools = await this.cacheManager.get<Pool[]>('pools');
    if (pools) {
      return pools;
    } else {
      throw new Error('empty');
    }
  }

  // TODO: delete
  private async fetchPools(): Promise<Pool[]> {
    const pools = await this.integrationService.getPools();
    // postponed save in async queue
    this.cacheManager.set<Pool[]>('pools', pools, { ttl: POOLS_CACHE_TIME });
    return pools;
  }
}
