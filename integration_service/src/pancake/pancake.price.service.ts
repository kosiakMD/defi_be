import { Injectable } from '@nestjs/common';

import { LiquidityPoolsEntity } from '../pools/entities/liquidity.pools.entity';
import { PoolsService } from '../pools/pools.service';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';
import { PANCAKE_PROJECT, PANCAKE_V2_PROJECT } from './util/contants';
import { deriveBNBPerToken, deriveBNBPrice } from './util/pricing';
import { ChainIdEnum, ChainNameEnum, CurrencyEnum, CurrencyIdEnum } from 'src/common/enum';

@Injectable()
export class PancakePriceService {
  constructor(private readonly poolsService: PoolsService) {}

  async liquidityPoolsPrices(): Promise<PriceResponseDto<PricesPayload>> {
    const poolsV1: LiquidityPoolsEntity[] = await this.poolsService.getProjectPools(
      PANCAKE_PROJECT,
    );
    const poolsV2: LiquidityPoolsEntity[] = await this.poolsService.getProjectPools(
      PANCAKE_V2_PROJECT,
    );
    const allPools: LiquidityPoolsEntity[] = [...poolsV1, ...poolsV2];
    const priceResponse: PriceResponseDto<PricesPayload> = {
      chain: {
        id: ChainIdEnum.bsc,
        name: ChainNameEnum.bsc,
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
