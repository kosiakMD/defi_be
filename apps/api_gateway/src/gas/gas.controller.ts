import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { GasHistoryDto, GasPriceDto } from '@app/common/dto';
import { GasHistory, GasPrice } from '@app/common/interfaces';

import { GasService } from './gas.service';

const GAS_CURRENT_CACHE_TIME_IN_SEC = 30;
const GAS_HISTORY_CACHE_TIME_IN_SEC = 15 * 60;

@ApiTags('Gas')
@Controller('v1/gas')
export class GasController {
  constructor(
    private service: GasService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: GasPriceDto })
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
        (async () => {
          await this.cacheManager.set<any>(cacheKey, gas, {
            ttl: GAS_CURRENT_CACHE_TIME_IN_SEC,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e: any) {
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
  @ApiResponse({ status: HttpStatus.OK, type: GasHistoryDto, isArray: true })
  public async getHistory(): Promise<GasHistory[]> {
    const cacheKey = 'gas_history';
    const logString = `Cache ${cacheKey} is `;
    let gas = await this.cacheManager.get<any>(cacheKey);

    if (!gas) {
      try {
        this.logger.debug(logString + 'fetching');

        this.logger.time('getGasHistory');
        gas = await this.service.getGasHistory();
        this.logger.timeEnd('getGasHistory');
        (async () => {
          await this.cacheManager.set<any>(cacheKey, gas, {
            ttl: GAS_HISTORY_CACHE_TIME_IN_SEC,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e: any) {
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
}
