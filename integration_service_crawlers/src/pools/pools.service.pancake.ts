import { Injectable } from '@nestjs/common';
import { Pair } from 'src/thegraph/uniswap/pair.interface';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Web3Provider } from '../chain/web3.provider';
import { BlocksBscSubgraph } from '../thegraph/blocks/blocks.bsc.subgraph';
import { PancakeSubgraph } from '../thegraph/pancake/pancake.subgraph';
import { LiquidityPool } from './dto/liquiditypool.dto';
import { PoolsServiceUniswap } from './pools.service.uniswap';
import {
  CHAIN_ID_BSC,
  PROJECT_PANCAKE,
  TIMESTAMP_DAY_BEFORE_CURRENT,
  TIMESTAMP_MONTH_BEFORE_CURRENT,
  TIMESTAMP_WEEK_BEFORE_CURRENT,
} from './pools.utils';
import { BUSD } from './tokens/BUSD';
import { UNISWAP_PAIR_ABI } from './utils/pair';

@Injectable()
export class PoolsServicePancake extends PoolsServiceUniswap {
  protected BUSD_BNB_PAIR = '0x1b96b92314c44b159149f7e0303511fb2fc4774f';
  protected USDT_BNB_PAIR = '0x20bcc3b8a0091ddac2d0bc30f68e6cbb97de59cd';
  protected WBNB_TOKEN = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
  protected chain: number = CHAIN_ID_BSC;
  protected project: string = PROJECT_PANCAKE;
  protected minTVL = 50000;
  private web3ProviderBSC: Web3;

  constructor(
    protected readonly pancakeSubgraph: PancakeSubgraph,
    protected readonly blocksBscSubgraph: BlocksBscSubgraph,
    protected readonly web3Provider: Web3Provider,
  ) {
    super(pancakeSubgraph, blocksBscSubgraph);
    this.web3ProviderBSC = web3Provider.instanceBsc();
  }

  async getCurrentPairs(): Promise<LiquidityPool[]> {
    const pairsData = await this.uniswapSubgraph.getPairs(this.minTVL);
    const subgraphPairs = pairsData.data.from0to1000;
    subgraphPairs.forEach((sPair) => {
      // this pair is saved with wrong token in the subgraph:
      if (sPair.id == '0x1b96b92314c44b159149f7e0303511fb2fc4774f') {
        sPair.token1 = BUSD;
      }
    });

    const allReserves: Array<PairReserves> = await Promise.all(
      subgraphPairs.map((p) => {
        return this.getPairReserves(p.id);
      }),
    );

    const allSupplies: Array<PairSupply> = await Promise.all(
      subgraphPairs.map((p) => {
        return this.getPairTotalSupply(p.id);
      }),
    );

    // change pairs values because subgraph is not synced yet:
    subgraphPairs.map((p) => {
      const reserves = allReserves.find((r) => r.pair == p.id);
      const supply = allSupplies.find((r) => r.pair == p.id);
      p.totalSupply = supply.supply * Math.pow(10, -18);
      p.reserve0 = reserves.reserve0 * Math.pow(10, -p.token0.decimals);
      p.reserve1 = reserves.reserve1 * Math.pow(10, -p.token0.decimals);
    });

    const pancakeBNBPrice = this.deriveBNBPrice(subgraphPairs);

    subgraphPairs.reduce((prices, p) => {
      let token0PriceUSD = 0;
      let token1PriceUSD = 0;
      if (p.token0.id == this.WBNB_TOKEN) {
        token0PriceUSD = pancakeBNBPrice;
      }
      if (p.token1.id == this.WBNB_TOKEN) {
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

      const tvl = p.reserve0 * token0PriceUSD + p.reserve1 * token1PriceUSD;
      const lpTokenPrice = tvl / p.totalSupply;

      p.reserveUSD = tvl;
      return {
        ...prices,
        [p.token0.id]: token0PriceUSD,
        [p.token1.id]: token1PriceUSD,
        [p.id]: lpTokenPrice,
      };
    }, {});

    return subgraphPairs.reduce((lPools, p) => {
      const lPool: LiquidityPool = {
        id: p.id,
        chain: CHAIN_ID_BSC,
        project: this.project,
        reserveUSD: p.reserveUSD,
        fee24h: null,
        apy: {
          day: null,
          week: null,
          month: null,
        },
        il: {
          day: null,
          dayUSD: null,
          week: null,
          weekUSD: null,
          month: null,
          monthUSD: null,
        },
        poolToken: {
          id: p.id,
          totalSupply: p.totalSupply,
        },
        tokens: [
          {
            ...p.token0,
            positionInPool: 0,
          },
          {
            ...p.token1,
            positionInPool: 1,
          },
        ],
      };

      return [...lPools, lPool];
    }, []);
  }

  private findBNBPriceForToken(token: string, pairs: Pair[]) {
    let bnbPair = pairs.find((p) => p.token0.id == token && p.token1.id == this.WBNB_TOKEN);
    if (!bnbPair) {
      bnbPair = pairs.find((p) => p.token1.id == token && p.token0.id == this.WBNB_TOKEN);
    }
    if (!bnbPair) {
      return 0;
    }
    if (bnbPair.token0.id == token) {
      return bnbPair.reserve1 / bnbPair.reserve0;
    } else {
      return bnbPair.reserve0 / bnbPair.reserve1;
    }
  }

  private deriveBNBPrice(pools: Pair[]) {
    const BUSD_BNB_PAIR = pools.find((p) => p.id == this.BUSD_BNB_PAIR);
    const USDT_BNB_PAIR = pools.find((p) => p.id == this.USDT_BNB_PAIR);

    const totalLiquidityBNB = Number(BUSD_BNB_PAIR.reserve0) + Number(USDT_BNB_PAIR.reserve1);

    const busdWeight = BUSD_BNB_PAIR.reserve0 / totalLiquidityBNB;
    const usdtWeight = USDT_BNB_PAIR.reserve1 / totalLiquidityBNB;

    const bnbPriceBusd = BUSD_BNB_PAIR.reserve1 / BUSD_BNB_PAIR.reserve0;
    const usdtPriceBusd = USDT_BNB_PAIR.reserve0 / USDT_BNB_PAIR.reserve1;

    return bnbPriceBusd * busdWeight + usdtPriceBusd * usdtWeight;
  }

  private async getPairReserves(pair: string) {
    const pairContract = new this.web3ProviderBSC.eth.Contract(UNISWAP_PAIR_ABI as AbiItem[], pair);
    const reserves = await pairContract.methods.getReserves().call();
    return {
      pair: pair,
      /* jshint ignore:start*/
      reserve0: reserves['_reserve0'],
      reserve1: reserves['_reserve1'],
      /* jshint ignore:end */
    };
  }

  private async getPairTotalSupply(pair: string) {
    const pairContract = new this.web3ProviderBSC.eth.Contract(UNISWAP_PAIR_ABI as AbiItem[], pair);
    const supply = await pairContract.methods.totalSupply().call();
    return {
      pair: pair,
      supply: supply,
    };
  }

  async getPoolsToHandle(): Promise<LiquidityPool[]> {
    const [blockDataDayBefore, blockDataWeekBefore, blockDataMonthBefore] = await Promise.all([
      this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_DAY_BEFORE_CURRENT),
      this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_WEEK_BEFORE_CURRENT),
      this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_MONTH_BEFORE_CURRENT),
    ]);
    const lastDayBlockNumber = blockDataDayBefore.data.blocks[0].number;
    const lastWeekBlockNumber = blockDataWeekBefore.data.blocks[0].number;
    const lastMonthBlockNumber = blockDataMonthBefore.data.blocks[0].number;

    // get up to 3k pair in concurrent requests
    const [
      pairsDataCurrent,
      pairsDataDayBefore,
      pairsDataWeekBefore,
      pairsDataMonthBefore,
    ] = await Promise.all([
      this.uniswapSubgraph.getPairs(this.minTVL),
      this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastDayBlockNumber),
      this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastWeekBlockNumber),
      this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastMonthBlockNumber),
    ]);
    const allCurrentPairsData = pairsDataCurrent.data.from0to1000;
    // in case of subgraph is not synced yet
    const allPairsDataDayBefore =
      pairsDataDayBefore.data === undefined ? [] : pairsDataDayBefore.data.from0to1000;
    const allPairsDataWeekBefore =
      pairsDataWeekBefore.data === undefined ? [] : pairsDataWeekBefore.data.from0to1000;
    const allPairsDataMonthBefore =
      pairsDataMonthBefore.data === undefined ? [] : pairsDataMonthBefore.data.from0to1000;

    return this.getPairsWithCalculatedFields(allCurrentPairsData, [
      allPairsDataDayBefore,
      allPairsDataWeekBefore,
      allPairsDataMonthBefore,
    ]);
  }
}

interface PairReserves {
  pair: string;
  reserve0: number;
  reserve1: number;
}

interface PairSupply {
  pair: string;
  supply: number;
}
