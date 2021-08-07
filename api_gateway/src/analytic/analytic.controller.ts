import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AccountService } from 'src/account/account.service';

import { ProfitAndLossQueryDto, ProfitAndLossResponseDto } from './dto';

@ApiTags('Analytic')
@Controller('analytic')
export class AnalyticController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private accountService: AccountService,
  ) {}

  @Get('')
  @ApiResponse({ status: 200, type: ProfitAndLossResponseDto })
  async getProfitAndLossValues(
    @Query() query: ProfitAndLossQueryDto,
  ): Promise<ProfitAndLossResponseDto> {
    try {
      const { asset, addresses, chain } = query;
      return await this.accountService.getProfitAndLoss(asset, chain, addresses);
    } catch (e) {
      this.logger.error(e, 'AccountService.getProfitAndLoss');
      throw e;
    }
  }
}
