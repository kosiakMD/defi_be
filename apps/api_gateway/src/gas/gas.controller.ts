import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { GasHistoryDto, GasPriceDto } from '@app/common/dto/Gas.dto';
import { GasHistory, GasPrice } from '@app/common/interfaces';

import { GasService } from './gas.service';

// TODO: can be null as updated each time
const GAS_CURRENT_CACHE_TIME = 30; // 30 sec as Gas current updates
const GAS_HISTORY_CACHE_TIME = 15 * 60; // 15 min as Gas history updates

@ApiTags('Gas')
@Controller('gas')
export class GasController {
  constructor(
    private service: GasService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiResponse({ status: 200, type: GasPriceDto })
  public async getCurrentPrice(): Promise<GasPrice> {
    const cacheKey = 'gas_current';
    const logString = `Cache ${cacheKey} is `;
    let gas = await this.cacheManager.get<any>(cacheKey);

    if (!gas) {
      try {
        this.logger.debug(logString + 'fetching');

        this.logger.time('getGasCurrent');
        gas = await this.service.getGasCurrent();
        this.logger.timeEnd('getGasCurrent');
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any>(cacheKey, gas, {
            ttl: GAS_CURRENT_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        gas = await this.cacheManager.get<any>(cacheKey);
        if (!gas) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }

    return gas;
  }

  @Get('/history')
  @ApiResponse({ status: 200, type: GasHistoryDto, isArray: true })
  public async getHistory(): Promise<GasHistory[]> {
    const cacheKey = 'gas_history';
    const logString = `Cache ${cacheKey} is `;
    let gas = await this.cacheManager.get<any>(cacheKey);

    if (!gas) {
      try {
        this.logger.debug(logString + 'fetching');

        this.logger.time('getGasHistory');
        gas = await this.service.getGasHistory();
        // gas = await Promise.any([this.readGasHistory(), this.fetchGasHistory()]);
        this.logger.timeEnd('getGasHistory');
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any>(cacheKey, gas, {
            ttl: GAS_HISTORY_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        gas = await this.cacheManager.get<any>(cacheKey);
        if (!gas) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return gas;
  }

  // private async readGasHistory(): Promise<GasHistory[]> {
  //   const gas = await this.cacheManager.get<GasHistory[]>('gas');
  //   if (gas) {
  //     return gas;
  //   } else {
  //     throw new Error('empty');
  //   }
  // }
  //
  // private async fetchGasHistory(): Promise<GasHistory[]> {
  //   const gas = await this.service.getGasHistory();
  //   // postponed save in async queue
  //   this.cacheManager.set<GasHistory[]>('gas', gas, { ttl: GAS_CACHE_TIME });
  //   return gas;
  // }
}
