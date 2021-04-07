import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import VaultDto from '../common/DTO/Vault.dto';
import { Logger } from '../common/Logger/Logger.service';
import { Vault } from '../common/interfaces';
import { VaultsService } from './vaults.service';

// TODO: can be null as updated each time
const VAULTS_CACHE_TIME = 60 * 60 * 1e3; // 1 hour

@ApiTags('Vaults')
@Controller('vaults')
export class VaultsController {
	constructor(
		private service: VaultsService,
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
		const [vaults] = await this.service.getAll();
		// postponed save in async queue
		this.cacheManager.set<Vault[]>('vaults', vaults, { ttl: VAULTS_CACHE_TIME });
		return vaults;
	}
}
