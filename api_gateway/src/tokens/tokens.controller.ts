import { CACHE_MANAGER, Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import TokenDto from '../common/DTO/Token.dto';
import { Logger } from '../common/Logger/Logger.service';
import { Token } from '../common/interfaces';
import { TokensService } from './tokens.service';

// TODO: can be null as updated each time
const TOKENS_CACHE_TIME = 60 * 60 * 1e3; // 1 hour

@ApiTags('Tokens')
@Controller('tokens')
export class TokensController {
	constructor(
		private service: TokensService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
	) {}

	@Get('/')
	@ApiResponse({ status: 200, type: TokenDto, isArray: true })
	@ApiResponse({ status: 500, type: HttpException })
	public async get(): Promise<TokenDto[]> {
		this.logger.time('getTokens');
		const tokens = await Promise.any([this.readTokens(), this.fetchTokens()]);
		this.logger.timeEnd('getTokens');
		return tokens;
	}

	private async readTokens(): Promise<Token[]> {
		const tokens = await this.cacheManager.get<Token[]>('tokens');
		if (tokens) {
			return tokens;
		} else {
			throw new Error('empty');
		}
	}

	private async fetchTokens(): Promise<Token[]> {
		const tokens = await this.service.getAll();
		// postponed save in async queue
		this.cacheManager.set<Token[]>('tokens', tokens, { ttl: TOKENS_CACHE_TIME });
		return tokens;
	}
}
