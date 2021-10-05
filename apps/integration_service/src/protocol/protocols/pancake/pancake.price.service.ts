import { Injectable } from '@nestjs/common';

import {
  ChainAbbrEnum,
  ChainIdEnum,
  ChainNameEnum,
  CurrencyEnum,
  CurrencyIdEnum,
  PancakeProtocolEnum,
} from '@app/common/enum';

import { LiquidityPoolsResponseDto } from '../../../pools/dto/liquidity.pools.response.dto';
import { PoolsService } from '../../../pools/pools.service';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';
import { deriveBNBPerToken, deriveBNBPrice } from './util/pricing';

@Injectable()
export class PancakePriceService {
  constructor(private readonly poolsService: PoolsService) {}

  async liquidityPoolsPrices(
    protocol: PancakeProtocolEnum,
  ): Promise<PriceResponseDto<PricesPayload>> {
    const allPools: LiquidityPoolsResponseDto[] = await this.poolsService.getProjectPools(protocol);

    const priceResponse: PriceResponseDto<PricesPayload> = {
      chain: {
        id: ChainIdEnum.bsc,
        name: ChainNameEnum.bsc,
        abbr: ChainAbbrEnum.bsc,
      },
      currency: {
        id: CurrencyIdEnum.usd,
        name: CurrencyEnum.usd,
      },
      prices: {},
    };

    const bnbPrice = deriveBNBPrice(allPools);
    allPools.map((p) => {
      p.poolTokens.map((pt) => {
        priceResponse.prices[pt.id] = deriveBNBPerToken(pt.id, allPools) * bnbPrice;
      });
    });

    return priceResponse;
  }
}
