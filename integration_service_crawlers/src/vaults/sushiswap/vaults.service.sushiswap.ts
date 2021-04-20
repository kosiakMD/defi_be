import { Injectable } from '@nestjs/common';

import { CoingeckoApi } from '../../apis/api/coingecko.api';
import { CHAIN_ETH, PROJECT_SUSHISWAP } from '../../pools/pools.utils';
import { BlocksSubgraph } from '../../thegraph/blocks/blocks.subgraph';
import { SushimasterchiefSubgraph } from '../../thegraph/sushimasterchief/sushimasterchief.subgraph';
import { SushiswapSubgraph } from '../../thegraph/sushiswap/sushiswap.subgraph';
import { Vault } from '../dto/vault.dto';
import { SUSHI } from './tokens/SUSHI';

@Injectable()
export class VaultsServiceSushiswap {
  protected chain: string = CHAIN_ETH;
  protected project: string = PROJECT_SUSHISWAP;
  constructor(
    protected readonly blocksSubgraph: BlocksSubgraph,
    protected readonly sushimasterchiefSubgraph: SushimasterchiefSubgraph,
    protected readonly sushiswapSubgraph: SushiswapSubgraph,
    protected readonly coingeckoApi: CoingeckoApi,
  ) {}
  async getVauts(): Promise<Vault[]> {
    const [blocks, vaultsData, rewardTokenPrice] = await Promise.all([
      this.blocksSubgraph.getLastBlocks(1000),
      this.sushimasterchiefSubgraph.getActiveVaults(),
      this.coingeckoApi.getPricesByAddresses(['usd'], [SUSHI.address]),
    ]);
    const rewardToken = {
      ...SUSHI,
      priceUSD: rewardTokenPrice[SUSHI.address]['usd'],
    };

    const liquidityPools = await this.sushiswapSubgraph.getVaultsData(
      vaultsData.data.pools.map((p) => p.pair),
    );
    const masterChief = vaultsData.data.chief[0];
    const avgBlockTime =
      (blocks.data.blocks[0].timestamp -
        blocks.data.blocks[blocks.data.blocks.length - 1].timestamp) /
      1000;

    return vaultsData.data.pools.map((vault) => {
      const liquidityPool = liquidityPools.data.pairs.find((p) => p.id == vault.pair);
      // only sushiswap liquidity pools in this case:
      if (liquidityPool != undefined) {
        const token0 = {
          ...liquidityPool.token0,
          percentage: 50,
        };
        const token1 = {
          ...liquidityPool.token1,
          percentage: 50,
        };
        const vaultTVL =
          ((vault.balance * 10 ** -18) / Number(liquidityPool.totalSupply)) *
          Number(liquidityPool.reserveUSD);

        let yearlyAPY = this.calculateAPY({
          allocPoints: vault.allocPoint,
          totalAllocPoints: masterChief.totalAllocPoint,
          rewardTokenPerBlock: masterChief.sushiPerBlock * 10 ** -rewardToken.decimals,
          rewardTokenPrice: rewardToken.priceUSD,
          farmingPoolTVL: vaultTVL,
          blockTime: avgBlockTime,
        });
        // because 2/3 of total rewards are locked for 6 months
        yearlyAPY = yearlyAPY / 3;
        const returned: Vault = {
          id: masterChief.id + '-' + vault.id,
          project: 'sushiswap',
          chain: this.chain,
          apy: {
            year: yearlyAPY,
            month: yearlyAPY / 12,
            day: yearlyAPY / 365,
          },
          tvl: vaultTVL,
          lpToken: {
            id: vault.pair,
          },
          liquidityPoolTokens: [token0, token1],
          rewardToken: {
            id: rewardToken.address,
            ...rewardToken,
          },
        };
        return returned;
      }
    });
  }

  public calculateAPY(apyData: SushiAPYData): number {
    const poolRewardPerBlock =
      (apyData.allocPoints / apyData.totalAllocPoints) *
      apyData.rewardTokenPerBlock *
      apyData.rewardTokenPrice;
    const apyPerBlock = (poolRewardPerBlock / apyData.farmingPoolTVL) * 100;
    const blocksPerYear = (86400 * 365) / apyData.blockTime;
    return apyPerBlock * blocksPerYear * 3;
  }
}

export interface SushiAPYData {
  allocPoints: number;
  totalAllocPoints: number;
  rewardTokenPerBlock: number;
  rewardTokenPrice: number;
  farmingPoolTVL: number;
  blockTime: number;
}
