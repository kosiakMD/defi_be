import * as Promise from 'bluebird';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import TokenDto from '@app/common/dto/Token.dto';
import { Token } from '@app/common/interfaces';

import { BaseService } from '../common/services/base.service';

const TOKENS_CACHE_TIME = 60 * 60 * 1e3; // 1 hour

@ApiTags('Tokens')
@Controller('v1/tokens')
export class TokensController extends BaseService {
  url = this.buildUrl(this.configService.get<string>('DEFIYIELD_INFO_2_URL'));

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super(logger, httpService, configService);
  }

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: TokenDto, isArray: true })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, type: HttpException })
  public async get(): Promise<TokenDto[]> {
    return await Promise.any([this.readTokens(), this.fetchTokens()]);
  }

  private async readTokens(): Promise<Token[]> {
    const tokens = await this.cacheManager.get<Token[]>('tokens');
    if (tokens) return tokens;
    throw new Error('empty');
  }

  private async fetchTokens(): Promise<Token[]> {
    const tokens = await this.requestProxy(this.url + 'tokens');
    await this.cacheManager.set<Token[]>('tokens', tokens, { ttl: TOKENS_CACHE_TIME });
    return tokens;
  }
}
