import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { ChainIdEnum } from '../common/enum';

import { AccountService } from '../account/account.service';
import { ProfitAndLossQueryDto, ProfitAndLossResponseDTO } from './dto';

@ApiTags('Analytic')
@Controller('v1/analytic')
export class AnalyticController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private accountService: AccountService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'asset',
    type: String,
    description: 'asset address',
    example: '0xe61fdaf474fac07063f2234fb9e60c1163cfa850',
    required: true,
  })
  @ApiQuery({
    name: 'chain',
    enum: ChainIdEnum,
    enumName: 'ChainIdEnum',
    description: 'chain 1 - Ethereum',
    example: ChainIdEnum.eth,
    required: true,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'list of bundled addresses',
    example: '0x1af067552304c2369037125466eeec6debe30b31',
    required: true,
  })
  @ApiResponse({ status: 200, type: ProfitAndLossResponseDTO })
  async getProfitAndLossValues(
    @Query() query: ProfitAndLossQueryDto,
  ): Promise<ProfitAndLossResponseDTO> {
    try {
      const { asset, addresses, chain } = query;
      return await this.accountService.getProfitAndLoss(asset, chain, addresses);
    } catch (e) {
      this.logger.error(e, 'AccountService.getProfitAndLoss');
      throw e;
    }
  }
}
