import { Injectable } from '@nestjs/common';

import { CoingeckoApi } from '../../apis/api/coingecko.api';
import { CHAIN_ETH, PROJECT_CURVE } from '../../pools/pools.utils';
import { CurveSubgraph } from '../../thegraph/curve/curve.subgraph';
import { Token } from '../dto/token.dto';
import { Vault } from '../dto/vault.dto';
import { GaugeRewards } from './gauge.rewards';
import { CRV } from './tokens/CRV';

@Injectable()
export class VaultsServiceCurve {
  protected chain: string = CHAIN_ETH;
  protected project: string = PROJECT_CURVE;
  constructor(
    protected readonly curveSubgraph: CurveSubgraph,
    protected readonly gaugeRewards: GaugeRewards,
    protected readonly coingeckoApi: CoingeckoApi,
  ) {}
  async getVauts(): Promise<Vault[]> {
    const [curvePools, tokenPrices, curveApys, coinPrices, eurPrice] = await Promise.all([
      this.curveSubgraph.getAllPools(),
      this.coingeckoApi.getPricesByAddresses(['usd'], [CRV.address]),
      this.gaugeRewards.getGaugesRewards(),
      this.coingeckoApi.getUSDPricesByIds('usd', ['ethereum', 'bitcoin']),
      // get eurs price as tether price
      this.coingeckoApi.getUSDPricesByIds('eur', ['tether']),
    ]);

    const stakingPoolsAddresses = curvePools.data.pools.map((pool) => pool.stakingPool);
    const stakingPoolPositions = await this.curveSubgraph.getLiquidityPositions(
      stakingPoolsAddresses,
    );
    const ratios = {};
    stakingPoolPositions.data.liquidityPositions.forEach((pool) => {
      ratios[pool.pool.id] = pool.poolTokenBalance / pool.pool.poolTokenSupply;
    }, {});

    const CRVToken = {
      ...CRV,
      priceUSD: tokenPrices[CRV.address]['usd'],
    };

    return this.getFormatedVaults(curvePools.data.pools, curveApys, CRVToken, ratios, [
      ...coinPrices,
      ...eurPrice,
    ]);
  }

  private getFormatedVaults(pools, rewards, rewardToken, ratios, prices): Vault[] {
    return pools
      .filter((pool) => typeof this.getAPYYear(pool, rewards) === 'number')
      .map((pool) => {
        const yearApy = this.getAPYYear(pool, rewards);

        const vault: Vault = {
          id: pool.stakingPool,
          project: this.project,
          chain: this.chain,
          name: pool.name,
          apy: {
            day: yearApy / 365,
            month: yearApy / 12,
            year: yearApy,
          },
          tvl: VaultsServiceCurve.getTokenPriceUSD(pool.name, prices) * ratios[pool.id],
          lpToken: {
            id: pool.poolToken.id,
            name: pool.poolToken.name,
          },
          liquidityPoolTokens: this.getFormatedCoins(pool),
          rewardToken: rewardToken,
        };
        return vault;
      });
  }

  private getAPYYear(pool, rewards): number {
    const reward = rewards.find((value) => value.name == pool.name);
    return reward ? reward.data.apy : null;
  }

  private getFormatedCoins(pool): Token[] {
    const tokensIDsInOrder: string[] = pool.assignedCoins.split(',');
    const tokenOrderIndex = (id) => tokensIDsInOrder.indexOf(id);

    const summTokensWithDecimals: number = pool.coins.reduce(
      (acc, coin) =>
        (acc += pool.balances[tokenOrderIndex(coin.id)] * Math.pow(10, -coin.decimals)),
      0,
    );
    return pool.coins.map((coin) => {
      return {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        percentage: parseInt(
          (
            pool.balances[tokenOrderIndex(coin.id)] *
            Math.pow(10, -coin.decimals) *
            (100 / summTokensWithDecimals)
          ).toFixed(),
        ),
      };
    });
  }

  private static getTokenPriceUSD(poolName: any, prices: any): number {
    // this means that pool has BTC as etalon token
    if (poolName.includes('btc') || poolName === 'ren') {
      const btcPriceUSD = prices.find((p) => p.id == 'bitcoin');
      return btcPriceUSD.current_price;
    }
    // this means that pool has ETH as etalon token
    if (poolName.includes('eth')) {
      const ethPriceUSD = prices.find((p) => p.id == 'ethereum');
      return ethPriceUSD.current_price;
    }
    // this means that pool has ETH as etalon token
    if (poolName.includes('eur')) {
      const ethPriceUSD = prices.find((p) => p.id == 'tether');
      return 1 / ethPriceUSD.current_price;
    }
    return 1;
  }
}
