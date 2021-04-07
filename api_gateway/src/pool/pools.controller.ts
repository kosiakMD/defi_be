import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import PoolDto from '../common/DTO/Pool.dto';
import { Logger } from '../common/Logger/Logger.service';
import { Pool } from '../common/interfaces';
import { PoolsService } from './pools.service';

// TODO: can be null as updated each time
const POOLS_CACHE_TIME = 60 * 60 * 1e3; // 1 hour

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
	constructor(
		private service: PoolsService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
	) {}

	@Get()
	@ApiResponse({ status: 200, type: PoolDto, isArray: true })
	@ApiResponse({ status: 500, type: HttpException })
	public async getPools(): Promise<Pool[]> {
		this.logger.time('getPools');
		const pools = await Promise.any([this.readPools(), this.fetchPools()]);
		this.logger.timeEnd('getPools');
		return pools;
		// const proxy = httpProxy.createProxyServer(function (req, res) {
		// 	proxy.web(req, res, {
		// 		target: `${process.env.VAULTS_SERVICE_URL}/${process.env.VAULTS_PATH}`,
		// 	});
		// });
	}

	private async readPools(): Promise<Pool[]> {
		const pools = await this.cacheManager.get<Pool[]>('pools');
		if (pools) {
			return pools;
		} else {
			throw new Error('empty');
		}
	}

	private async fetchPools(): Promise<Pool[]> {
		const [pools] = await this.service.getAll();
		// postponed save in async queue
		this.cacheManager.set<Pool[]>('pools', pools, { ttl: POOLS_CACHE_TIME });
		return pools;
	}
}
