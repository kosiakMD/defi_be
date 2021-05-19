import { Injectable } from '@nestjs/common';
import { PoolsService } from '../pools/pools.service';
import {
  BUSD_BNB_PAIR_ADDRESS,
  CURRENCY_USD,
  PANCAKE_PROJECT,
  USDT_BNB_PAIR_ADDRESS,
  WBNB_TOKEN_ADDRESS,
} from './util/contants';
import { Pair } from 'src/thegraph/uniswap/pair.dto';
import { LiquidityPoolsEntity } from '../pools/entities/liquidity.pools.entity';
import { CHAIN_BSC, CHAIN_ID_BSC } from '../pools/pools.setting';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';

@Injectable()
export class PancakePriceService {

  constructor(
    private readonly poolsService: PoolsService,
  ) {
  }

  async liquidityPoolsPrices(): Promise<PriceResponseDto<PricesPayload>> {
    const liquidityPools = await this.poolsService.getProjectPools(PANCAKE_PROJECT)
    const subgraphPairs = this.poolsToPairs(liquidityPools);
    const pancakeBNBPrice = this.deriveBNBPrice(subgraphPairs);

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

    subgraphPairs.map(p => {
      let token0PriceUSD = 0;
      let token1PriceUSD = 0;
      if (p.token0.id === WBNB_TOKEN_ADDRESS) {
        token0PriceUSD = pancakeBNBPrice;
      }
      if (p.token1.id === WBNB_TOKEN_ADDRESS) {
        token1PriceUSD = pancakeBNBPrice;
      }
      if (token0PriceUSD === 0) {
        const bnbTokenPrice = this.findBNBPriceForToken(p.token0.id, subgraphPairs);
        token0PriceUSD = bnbTokenPrice * pancakeBNBPrice;
      }
      if (token1PriceUSD === 0) {
        const bnbTokenPrice = this.findBNBPriceForToken(p.token1.id, subgraphPairs);
        token1PriceUSD = bnbTokenPrice * pancakeBNBPrice;
      }

      priceResponse.prices[p.token0.id] = token0PriceUSD
      priceResponse.prices[p.token1.id] = token1PriceUSD
    });

    return priceResponse
  }

  private deriveBNBPrice(pools: Pair[]) {
    const BUSD_BNB_PAIR = pools.find((p) => p.id === BUSD_BNB_PAIR_ADDRESS);
    const USDT_BNB_PAIR = pools.find((p) => p.id === USDT_BNB_PAIR_ADDRESS);

    const totalLiquidityBNB = Number(BUSD_BNB_PAIR.reserve0) + Number(USDT_BNB_PAIR.reserve1);

    const busdWeight = BUSD_BNB_PAIR.reserve0 / totalLiquidityBNB;
    const usdtWeight = USDT_BNB_PAIR.reserve1 / totalLiquidityBNB;

    const bnbPriceBusd = BUSD_BNB_PAIR.reserve1 / BUSD_BNB_PAIR.reserve0;
    const usdtPriceBusd = USDT_BNB_PAIR.reserve0 / USDT_BNB_PAIR.reserve1;

    return bnbPriceBusd * busdWeight + usdtPriceBusd * usdtWeight;
  }

  private findBNBPriceForToken(token: string, pairs: Pair[]) {
    let bnbPair = pairs.find((p) => p.token0.id === token && p.token1.id === WBNB_TOKEN_ADDRESS);
    if (!bnbPair) {
      bnbPair = pairs.find((p) => p.token1.id === token && p.token0.id === WBNB_TOKEN_ADDRESS);
    }
    if (!bnbPair) {
      return 0;
    }
    if (bnbPair.token0.id === token) {
      return bnbPair.reserve1 / bnbPair.reserve0;
    } else {
      return bnbPair.reserve0 / bnbPair.reserve1;
    }
  }

  private poolsToPairs(pools: LiquidityPoolsEntity[]): Pair[] {
    return pools.reduce((reduced, pool) => {
      const token0 = pool.poolTokens.find((p) => p.positionInPool === 0);
      const token1 = pool.poolTokens.find((p) => p.positionInPool === 1);
      return [
        ...reduced,
        {
          id: pool.address,
          token0: token0,
          token1: token1,
          reserve0: token0.reserve,
          reserve1: token1.reserve,
          totalSupply: pool.token.totalSupply,
          reserveUSD: pool.reserveUsd,
        },
      ];
    }, []);
  }
}
