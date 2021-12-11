import {
  Body,
  CacheInterceptor,
  CacheTTL,
  Controller,
  Get,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { BlacklistService } from '../modules/blacklists/blacklist.service';
import { BlacklistedAddress } from '../modules/blacklists/dto/blacklisted.address';
import { BlacklistedAddressSaveDto } from '../modules/blacklists/dto/blacklisted.address.save.dto';

@ApiTags('Blacklist')
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  @ApiResponse({ status: 200, type: [BlacklistedAddress] })
  getBlacklistedAddresses(): Promise<BlacklistedAddress[]> {
    return this.blacklistService.getAll();
  }

  @Post()
  @ApiResponse({ status: 200, type: BlacklistedAddress })
  saveBlacklistedAddress(
    @Body() addressSaveDto: BlacklistedAddressSaveDto,
  ): Promise<BlacklistedAddress> {
    return this.blacklistService.save(addressSaveDto);
  }
}
