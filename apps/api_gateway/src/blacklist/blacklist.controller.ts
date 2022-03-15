import {
  Body,
  CacheInterceptor,
  CacheTTL,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { BaseService } from '../common/services/base.service';

import { BlacklistedAddress } from './blacklisted.address';

@ApiTags('Blacklist')
@Controller('v1/blacklist')
export class BlacklistController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  @ApiResponse({ status: HttpStatus.OK, type: [BlacklistedAddress] })
  getBlacklistedAddresses(): Promise<BlacklistedAddress[]> {
    return this.requestProxy(this.url + 'v1/blacklist');
  }

  @Post()
  @CacheTTL(300)
  @ApiResponse({ status: HttpStatus.OK, type: [BlacklistedAddress] })
  postBlacklistedAddress(@Body() body: BlacklistedAddress): Promise<BlacklistedAddress[]> {
    return this.requestProxy(this.url + 'v1/blacklist', 'POST', body);
  }
}
