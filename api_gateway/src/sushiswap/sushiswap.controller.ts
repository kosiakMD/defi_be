import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import BaseDataDto from '../common/DTO/BaseData.dto';
import EthereumAddressDto from '../common/DTO/EthereumAddress.dto';
import { BaseData } from '../common/interfaces';

@ApiTags('Platform')
@Controller('sushiswap')
export class SushiswapController {
  @Get('/:address')
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  get(@Param() params: EthereumAddressDto): BaseData[] {
    const base = new BaseDataDto();
    return [base];
  }
}
