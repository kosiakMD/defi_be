import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { MultiCallBsc } from '../chain/multicall/multicallbsc';
import { Erc20TokenContract } from '../chain/token/erc20token.contract';
import { PairContract } from '../chain/uniswapv2pair/pair.contract';
import { Web3Provider } from '../chain/web3.provider';
import { LiquidityPool } from '../store/dto/liquiditypool/liquiditypool.dto';
import { Token } from '../store/dto/liquiditypool/token.dto';
import { LiquidityPoolsEntity } from '../store/entities/liquiditypools.entity';
import { LiquidityPoolsStore } from '../store/liquiditypools.store';
import { deriveBNBPerToken, deriveBNBPrice } from './helpers/pricing';
import { CHAIN_ID_BSC, PROJECT_PANCAKE, PROJECT_PANCAKE_V2 } from './pools.utils';
import { BNToDecimals, stringToDecimals } from './utils/number';

@Injectable()
export class PoolsServicePancake {
  protected chain: number = CHAIN_ID_BSC;
  protected project: string = PROJECT_PANCAKE;
  protected web3ProviderBSC: Web3;

  constructor(
    protected readonly liquidityPoolsStore: LiquidityPoolsStore,
    protected readonly web3Provider: Web3Provider,
    protected readonly multicall: MultiCallBsc,
  ) {
    this.web3ProviderBSC = web3Provider.instanceBsc();
  }

  async getCurrentPairs(): Promise<LiquidityPoolsEntity[]> {
    const poolsV1: LiquidityPoolsEntity[] = await this.liquidityPoolsStore.getProjectPools(
      PROJECT_PANCAKE,
    );
    const poolsV2: LiquidityPoolsEntity[] = await this.liquidityPoolsStore.getProjectPools(
      PROJECT_PANCAKE_V2,
    );
    const allPairs = await this.fillPairsData([...poolsV1, ...poolsV2]);
    return allPairs.reduce((a, c) => {
      const liquidityPool: LiquidityPool = {
        id: c.address,
        chain: Number(c.chain),
        project: c.project,
        reserveUSD: c.reserveUsd,
        fee24h: null,
        apy: c.apy,
        il: c.il,
        token: c.token,
        poolTokens: c.poolTokens,
      };
      return [...a, liquidityPool];
    }, []);
  }

  async fillPairsData(pools: LiquidityPoolsEntity[]): Promise<LiquidityPoolsEntity[]> {
    const poolsAddresses: string[] = [];
    pools.map((p) => poolsAddresses.push(p.address));

    // todo: handle block number, if blockchain is not synced no need to update data
    // getting all necessary data with multicall contract, so 2 calls in total:
    const [pairsReserves, totalSupplies] = await Promise.all([
      this.multicall.getPairsReserves(poolsAddresses),
      this.multicall.getTotalSupplies(poolsAddresses),
    ]);

    // update reserves and total supplies for pools:
    pools.map((p) => {
      const reserves = pairsReserves.reserves[p.address];
      const totalSupply = totalSupplies.totalSupplies[p.address];
      p.poolTokens.map((pt) => {
        pt.positionInPool === 0
          ? (pt.reserve = BNToDecimals(reserves.reserve0, pt.decimals).toString())
          : (pt.reserve = BNToDecimals(reserves.reserve1, pt.decimals).toString());
      });
      p.token.totalSupply = BNToDecimals(totalSupply).toString();
    });

    const bnbUsdPrice = deriveBNBPrice(pools);
    pools.map((p) => {
      p.reserveUsd = 0;
      p.poolTokens.map((pt) => {
        p.reserveUsd += pt.reserve * deriveBNBPerToken(pt.id, pools) * bnbUsdPrice;
      });
    });
    return pools;
  }

  async getLiquidityPoolChainData(address: string) {
    const tokenContract = new Erc20TokenContract(this.web3ProviderBSC, address);
    const pairContract = new PairContract(this.web3ProviderBSC, address);

    const [token0Address, token1Address, pairTokenSupply, pairReserves] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
      tokenContract.totalSupply(),
      this.multicall.getPairsReserves([address]),
    ]);

    const [token0, token1] = await Promise.all([
      this.getTokenFields(token0Address),
      this.getTokenFields(token1Address),
    ]);

    const lPoolChainData: LiquidityPool = {
      id: address.toLowerCase(),
      chain: CHAIN_ID_BSC,
      project: PROJECT_PANCAKE_V2,
      reserveUSD: 0,
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
      token: {
        id: address.toLowerCase(),
        totalSupply: stringToDecimals(pairTokenSupply),
      },
      poolTokens: [
        {
          ...token0,
          reserve: BNToDecimals(pairReserves.reserves[address].reserve0, token0.decimals),
          positionInPool: 0,
          percentage: 50,
        },
        {
          ...token1,
          reserve: BNToDecimals(pairReserves.reserves[address].reserve1, token1.decimals),
          positionInPool: 1,
          percentage: 50,
        },
      ],
    };

    return lPoolChainData;
  }

  async getTokenFields(token: string): Promise<Token> {
    const tokenContract = new Erc20TokenContract(this.web3ProviderBSC, token);
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return {
      id: token.toLowerCase(),
      name: name,
      symbol: symbol,
      decimals: decimals,
    };
  }
}
