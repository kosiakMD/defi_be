import { CACHE_MANAGER, Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { GasHistoryDto, GasPriceDto } from '../DTO/Gas.dto';
import { GasHistory, GasPrice } from '../interfaces';
import { GasService } from './gas.service';

// TODO: can be null as updated each time
const GAS_CACHE_TIME = 15 * 60 * 1e3; // 15 min as Gas history updates

@ApiTags('Gas')
@Controller('gas')
export class GasController {
	constructor(private service: GasService, @Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	@Get('/current_price')
	@ApiResponse({ status: 200, type: GasPriceDto })
	public getCurrentPrice(): Promise<GasPrice> {
		return this.service.getGasCurrent();
	}

	@Get('/history')
	@ApiResponse({ status: 200, type: GasHistoryDto, isArray: true })
	public async getHistory(): Promise<GasHistory[]> {
		console.time('getGasHistory');
		const gas = await Promise.any([this.readGasHistory(), this.fetchGasHistory()]);
		console.timeEnd('getGasHistory');
		return gas;
	}

	@Get('/cost')
	@ApiResponse({ status: 200, type: Number })
	public getCost(): number {
		// TODO: gasUsed * gasPrice to ETH
		return 0;
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
