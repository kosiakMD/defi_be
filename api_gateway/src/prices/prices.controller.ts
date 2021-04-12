import { Controller, Get, Param, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import HistoricalPriceDto from '../common/DTO/HistoricalPrice.dto';
import { Address } from '../common/interfaces';
import { ChainEnum } from '../enum';
import { HistoricalPrices } from './prices.interface';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  constructor(private service: PricesService) {}

  @Get('/:chainId')
  @ApiParam({
    name: 'chainId',
    enum: ChainEnum,
    required: false,
    description: `Chain (platform) ID`,
    example: ChainEnum.Ethereum,
  })
  @ApiQuery({
    name: 'tokens',
    type: String,
    example:
      '0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000',
    description: 'comma-separated Array String',
  })
  @ApiResponse({ status: 200, type: String })
  async get(
    @Query('tokens', new ParseArrayPipe({ items: String, separator: ',' }))
    tokens: Address[],
    @Param('chainId') chainId: number = ChainEnum.Ethereum,
  ): Promise<any> {
    const currencyId = 1;
    return this.service.getPrices(tokens, currencyId, chainId);
  }

  @Get('/historical/:chainId')
  @ApiParam({
    name: 'chainId',
    enum: ChainEnum,
    required: false,
    description: `Chain (platform) ID`,
    example: ChainEnum.Ethereum,
  })
  @ApiQuery({
    name: 'tokens',
    type: String,
    description: 'comma-separated array of price tokens',
    example: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984,0x66a0f676479cee1d7373f3dc2e2952778bff6',
  })
  @ApiQuery({
    name: 'timestamps',
    type: String,
    description: 'comma-separated array of price time stamps',
    example: '1600992000,1609459200',
  })
  @ApiResponse({ status: 200, type: HistoricalPriceDto, isArray: true })
  async getHistory(
    @Param('chainId') chainId: number = ChainEnum.Ethereum,
    @Query('tokens', new ParseArrayPipe({ items: String, separator: ',' })) tokens,
    @Query('timestamps', new ParseArrayPipe({ items: String, separator: ',' })) timestamps,
  ): Promise<HistoricalPrices> {
    const currencyId = 1;
    return this.service.getHistorical(tokens, timestamps, currencyId, chainId);
  }
}
