import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

enum NetworkEnum {
  'false' = '0',
  'true' = '1',
}

@ApiTags('Swap')
@Controller('swap')
export class SwapController {
  @ApiResponse({ status: 200, type: String })
  @Get('availabletokens')
  get(): string[] {
    return [];
  }

  // TODO: provide DTO
  @ApiQuery({ name: 'from', type: Number, description: 'from' })
  @ApiQuery({ name: 'to', type: Number, description: 'to' })
  @ApiQuery({ name: 'amount', type: Number, description: 'amount' })
  @ApiQuery({ name: 'side', type: String, description: 'side' })
  @ApiQuery({
    name: 'network',
    enum: NetworkEnum,
    enumName: 'NetworkEnum',
    required: false,
    example: NetworkEnum.true,
    description: 'default = 1',
  })
  @ApiResponse({ status: 200, type: Object })
  @Get('prices')
  getPrices(
    @Query('from') from: number,
    @Query('to') to: number,
    @Query('amount') amount: number,
    @Query('side') side: string,
    @Query('network') network: NetworkEnum = NetworkEnum.true,
  ): any {
    return { from, to, amount, side, network };
  }

  @ApiQuery({ name: 'sellToken', type: String, description: 'sellToken' })
  @ApiResponse({ type: String })
  @Get('tokenspricesbytoken')
  getTokensPriceByToken(@Query('sellToken') sellToken: string): any {
    return { sellToken };
  }

  // TODO: provide DTO
  @ApiQuery({ name: 'sellToken', type: String, description: 'sellToken' })
  @ApiQuery({ name: 'buyToken', type: String, description: 'buyToken' })
  @ApiQuery({ name: 'sellAmount', type: String, description: 'sellAmount' })
  @ApiResponse({ type: Object })
  @Get('tokenspricesbytokens')
  getTokensPriceByTokens(
    @Query('sellToken') sellToken: string,
    @Query('buyToken') buyToken: string,
    @Query('sellAmount') sellAmount: string,
  ): any {
    return { sellToken, buyToken, sellAmount };
  }
}
