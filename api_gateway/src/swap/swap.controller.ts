import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { SwapPricesResponseDto } from './dto/prices.response.dto';
import { TokensPricesByTokensQueryDto } from './dto/tokens.prices.by.tokens.query.dto';
import { TokensPricesByTokensResponseDto } from './dto/tokens.prices.by.tokens.response.dto';
import { SwapPricesQuery } from './interfaces';

@ApiTags('Swap')
@Controller('swap')
export class SwapController {
  @Get('availabletokens')
  @ApiResponse({ status: 200, type: String, isArray: true })
  get(): string[] {
    return [];
  }

  @Get('prices')
  @ApiResponse({ status: 200, type: SwapPricesResponseDto })
  getPrices(@Query() query: SwapPricesQuery): SwapPricesResponseDto {
    return query;
  }

  @Get('tokenspricesbytoken')
  @ApiResponse({ status: 200, type: TokensPricesByTokensResponseDto })
  getTokensPriceByToken(
    @Query() query: TokensPricesByTokensQueryDto,
  ): TokensPricesByTokensResponseDto {
    return query;
  }

  // TODO: provide DTO
  @Get('tokenspricesbytokens')
  @ApiResponse({ status: 200, type: TokensPricesByTokensResponseDto })
  getTokensPriceByTokens(
    @Query() query: TokensPricesByTokensQueryDto,
  ): TokensPricesByTokensResponseDto {
    return query;
  }
}
