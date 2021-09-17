import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common/enum';

import { StakingPositionResponseDto } from '../integrations/integrations.dto';
import { AutofarmRequestDto } from './dto/autofarm.request.dto';
import { AutofarmService } from './services/autofarm.service';

@ApiTags('Autofarm')
@Controller('autofarm')
export class AutofarmController {
  constructor(protected readonly autofarmService: AutofarmService) {}

  @Get()
  @ApiQuery({
    name: 'chain',
    enum: ChainIdEnum,
    description: 'Chain ID',
    example: ChainIdEnum.bsc,
  })
  @ApiQuery({
    name: 'address',
    type: String,
    example: '0x60de7f647df2448ef17b9e0123411724de6e373d',
  })
  @ApiResponse({ status: 200, type: StakingPositionResponseDto, isArray: true })
  async getAutofarmStakingPosition(
    @Query() query: AutofarmRequestDto,
  ): Promise<StakingPositionResponseDto[]> {
    const { address, chain } = query;
    return await this.autofarmService.getDataByAddresses(address, chain);
  }
}
