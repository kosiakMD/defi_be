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

import { BlacklistService } from '../modules/blacklists/blacklist.service';
import { BlacklistedAddressSaveDto } from '../modules/blacklists/dto/blacklisted.address.save.dto';
import { BlacklistedAddressesEntity } from '../modules/blacklists/entities/blacklisted-addresses.entity';

@ApiTags('Blacklist')
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  @ApiResponse({ status: HttpStatus.OK, type: [BlacklistedAddressesEntity] })
  getBlacklistedAddresses(): Promise<BlacklistedAddressesEntity[]> {
    return this.blacklistService.getAll();
  }

  @Post()
  @ApiResponse({ status: HttpStatus.OK, type: BlacklistedAddressesEntity })
  saveBlacklistedAddress(
    @Body() addressSaveDto: BlacklistedAddressSaveDto,
  ): Promise<BlacklistedAddressesEntity> {
    return this.blacklistService.upsertOne(addressSaveDto);
  }
}
