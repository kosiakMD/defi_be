import { CacheInterceptor, CacheTTL, Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { BlacklistService } from './blacklist.service';
import { BlacklistedAddress } from './blacklisted.address';

@ApiTags('Blacklist')
@Controller('v1/blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  @ApiResponse({ status: 200, type: [BlacklistedAddress] })
  getBlacklistedAddresses(): Promise<BlacklistedAddress[]> {
    return this.blacklistService.getAll();
  }
}
