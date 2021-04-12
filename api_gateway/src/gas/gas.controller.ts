import { CACHE_MANAGER, Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { GasHistoryDto, GasPriceDto } from '../common/DTO/Gas.dto';
import { Logger } from '../common/Logger/Logger.service';
import { GasHistory, GasPrice } from '../common/interfaces';
import { GasService } from './gas.service';

// TODO: can be null as updated each time
const GAS_CACHE_TIME = 15 * 60 * 1e3; // 15 min as Gas history updates

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
  public getCurrentPrice(): Promise<GasPrice> {
    return this.service.getGasCurrent();
  }

  @Get('/history')
  @ApiResponse({ status: 200, type: GasHistoryDto, isArray: true })
  public async getHistory(): Promise<GasHistory[]> {
    this.logger.time('getGasHistory');
    const gas = await Promise.any([this.readGasHistory(), this.fetchGasHistory()]);
    this.logger.timeEnd('getGasHistory');
    return gas;
  }

  private async readGasHistory(): Promise<GasHistory[]> {
    const gas = await this.cacheManager.get<GasHistory[]>('gas');
    if (gas) {
      return gas;
    } else {
      throw new Error('empty');
    }
  }

  private async fetchGasHistory(): Promise<GasHistory[]> {
    const gas = await this.service.getGasHistory();
    // postponed save in async queue
    this.cacheManager.set<GasHistory[]>('gas', gas, { ttl: GAS_CACHE_TIME });
    return gas;
  }
}
