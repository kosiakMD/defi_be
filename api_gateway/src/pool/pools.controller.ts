import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import PoolDto from '../DTO/Pool.dto';
import { Pool } from '../interfaces';
import { PoolsService } from './pools.service';

const POOLS_CACHE_TIME = 60 * 60 * 1e3; // 1 hour

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
	constructor(private service: PoolsService, @Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	@Get()
	@ApiResponse({ status: 200, type: PoolDto, isArray: true })
	@ApiResponse({ status: 500, type: HttpException })
	async getPools(): Promise<Pool[]> {
		console.time('getPools');
		const pools = await Promise.any([this.readPools(), this.fetchPools()]);
		console.timeEnd('getPools');
		return pools;
	}

	async readPools(): Promise<Pool[]> {
		const pools = await this.cacheManager.get<Pool[]>('pools');
		if (pools) {
			return pools;
		} else {
			throw new Error('empty');
		}
	}

	async fetchPools(): Promise<Pool[]> {
		const [pools] = await this.service.getAll();
		// postponed in async queue
		this.cacheManager.set<Pool[]>('pools', pools, { ttl: POOLS_CACHE_TIME });
		return pools;
	}
}
