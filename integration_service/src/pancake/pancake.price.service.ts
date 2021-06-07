import { Injectable } from '@nestjs/common';
import { PoolsService } from '../pools/pools.service';
import { CURRENCY_USD, PANCAKE_PROJECT, PANCAKE_V2_PROJECT } from './util/contants';
import { LiquidityPoolsEntity } from '../pools/entities/liquidity.pools.entity';
import { CHAIN_BSC, CHAIN_ID_BSC } from '../pools/pools.setting';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';
import { deriveBNBPerToken, deriveBNBPrice } from './util/pricing';

@Injectable()
export class PancakePriceService {

  constructor(
    private readonly poolsService: PoolsService,
  ) {
  }

  async liquidityPoolsPrices(): Promise<PriceResponseDto<PricesPayload>> {
    const poolsV1: LiquidityPoolsEntity[] = await this.poolsService.getProjectPools(
      PANCAKE_PROJECT,
    );
    const poolsV2: LiquidityPoolsEntity[] = await this.poolsService.getProjectPools(
      PANCAKE_V2_PROJECT,
    );
    const allPools: LiquidityPoolsEntity[] = [...poolsV1, ...poolsV2]
    const priceResponse: PriceResponseDto<PricesPayload> = {
      chain: {
        id: CHAIN_ID_BSC,
        name: CHAIN_BSC
      },
      currency: {
        id: 1,
        name: CURRENCY_USD
      },
      prices: {}
    }

    const bnbPrice = deriveBNBPrice(allPools);
    allPools.map(p => {
      p.poolTokens.map((pt) => {
        priceResponse.prices[pt.id] = deriveBNBPerToken(pt.id, allPools) * bnbPrice
      });
    });

    return priceResponse
  }
}
