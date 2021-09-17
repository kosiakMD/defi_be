import { Controller, Get, Query } from '@nestjs/common';

import { BaseData } from '@app/common';

import { QuickswapQueryDto } from './dto';
import { QuickswapService } from './quickswap.service';

@Controller('integration')
export class QuickswapController {
  constructor(private readonly quickswapService: QuickswapService) {}

  @Get('/quickswap')
  async getDataByAddresses(@Query() query: QuickswapQueryDto): Promise<BaseData[]> {
    const { addresses } = query;

    return await this.quickswapService.getDataByAddresses(addresses);
  }
}
