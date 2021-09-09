import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { MultiCallBsc } from '../chain/multicall/multicallbsc';
import { Web3Provider } from '../chain/web3.provider';
import { PancakeProtocolEnum, ProjectEnum } from '../config/projects';
import { LiquidityPool } from '../store/dto/liquiditypool/liquiditypool.dto';
import { LiquidityPoolsEntity } from '../store/entities/liquiditypools.entity';
import { LiquidityPoolsStore } from '../store/liquiditypools.store';
import { deriveBNBPerToken, deriveBNBPrice } from './helpers/pricing';
import { CHAIN_ID_BSC } from './pools.utils';
import { BNToDecimals } from './utils/number';

@Injectable()
export class PoolsServicePancake {
  protected chain: number = CHAIN_ID_BSC;
  protected project: string = ProjectEnum.pancake;
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
      PancakeProtocolEnum.pancakeV1,
    );
    const poolsV2: LiquidityPoolsEntity[] = await this.liquidityPoolsStore.getProjectPools(
      PancakeProtocolEnum.pancakeV2,
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
}
