import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountService, BalanceToken } from '../account/account.service';
import { EtherscanService } from '../etherscan/etherscan.service';
import {
  UniswapLiquidityPosition,
  UniswapLiquidityPositionPair,
} from '../interfaces/liquidity.position.interfaces';
import { Base, UniswapResponseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { LiquidityPoolsEntity } from '../pools/entities/liquidity.pools.entity';
import { PoolsService } from '../pools/pools.service';
import { PROJECT_PANCAKE } from '../pools/pools.setting';
import { PancakeSubgraph } from '../thegraph/pancake.subgraph';
import { getDataByAddresses, getDbDataByAddresses } from '../utils/util';
import { PancakeBurnsEntity } from './entity/pancake.burns.entity';
import { PancakeMintsEntity } from './entity/pancake.mints.entity';
import { PancakeSnapshotsEntity } from './entity/pancake.snapshots.entity';
import { PancakeSwapsEntity } from './entity/pancake.swaps.entity';
import { PANCAKE_PROJECT, PANCAKE_V2_PROJECT } from './util/contants';

@Injectable()
export class PancakeService {
  constructor(
    @InjectRepository(PancakeSwapsEntity)
    private readonly swapsRepository: Repository<PancakeSwapsEntity>,
    @InjectRepository(PancakeMintsEntity)
    private readonly mintsRepository: Repository<PancakeMintsEntity>,
    @InjectRepository(PancakeBurnsEntity)
    private readonly burnsRepository: Repository<PancakeBurnsEntity>,
    @InjectRepository(PancakeSnapshotsEntity)
    private readonly snapshotsRepository: Repository<PancakeSnapshotsEntity>,
    private readonly mapper: Mapper,
    private readonly pancakeSubgraph: PancakeSubgraph,
    private readonly accountService: AccountService,
    private readonly poolsService: PoolsService,
    private readonly etherscanService: EtherscanService,
  ) {}

  async getDbLiquidityPositions(addresses: string): Promise<UniswapResponseData> {
    const addressesArray: string[] = addresses.split(',');
    let allPools: LiquidityPoolsEntity[] = [];
    const [balances, pools, poolsV2] = await Promise.all([
      this.etherscanService.getBalances(addressesArray),
      this.poolsService.getProjectPools(PANCAKE_PROJECT),
      this.poolsService.getProjectPools(PANCAKE_V2_PROJECT),
    ]);
    allPools = allPools.concat(pools).concat(poolsV2);

    const liquidityPositions: UniswapResponseData = {
      uniswapLiquidityPositions: new Map<string, UniswapLiquidityPosition[]>(),
    };
    Object.keys(balances).map((key) => {
      balances[key].tokens.map((t) => {
        const pool = allPools.find((p) => p.address === t.token.token.address);
        if (pool) {
          if (!liquidityPositions.uniswapLiquidityPositions.has(key)) {
            liquidityPositions.uniswapLiquidityPositions.set(key, []);
          }
          let positions = liquidityPositions.uniswapLiquidityPositions.get(key);
          positions = [...positions, PancakeService.createLiquidityPosition(key, pool, t)];
          liquidityPositions.uniswapLiquidityPositions.set(key, positions);
        }
      });
    });

    return liquidityPositions;
  }

  private static createLiquidityPosition(
    user: string,
    pool: LiquidityPoolsEntity,
    balance: BalanceToken,
  ): UniswapLiquidityPosition {
    const token0 = pool.poolTokens.find((t) => t.positionInPool === 0);
    const token1 = pool.poolTokens.find((t) => t.positionInPool === 1);

    const pair: UniswapLiquidityPositionPair = {
      id: pool.address,
      reserve0: token0.reserve.toString(),
      reserve1: token1.reserve.toString(),
      reserveUSD: pool.reserveUsd.toString(),
      token0: {
        id: token0.id,
        name: token0.name,
        symbol: token0.symbol,
        decimals: token0.decimals.toString(),
      },
      token0Price: '0',
      token1: {
        id: token1.id,
        name: token1.name,
        symbol: token1.symbol,
        decimals: token1.decimals.toString(),
      },
      token1Price: '0',
      totalSupply: pool.token.totalSupply.toString(),
    };

    return {
      liquidityTokenBalance: balance.decimalsAmount.toString(),
      user: user,
      pair: pair,
    };
  }

  async getDataExternal(addresses: string): Promise<Base[]> {
    const originAddressesArray = addresses.split(',');
    const result = await getDataByAddresses(
      this.swapsRepository,
      this.mintsRepository,
      this.burnsRepository,
      this.snapshotsRepository,
      originAddressesArray,
      this.pancakeSubgraph,
    );
    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      PROJECT_PANCAKE,
    );
  }

  async getDataInternal(addresses: string): Promise<Base[]> {
    const originAddressesArray = addresses.split(',');

    const result = await getDbDataByAddresses(
      this.swapsRepository,
      this.mintsRepository,
      this.burnsRepository,
      this.snapshotsRepository,
      originAddressesArray,
    );

    const internalSubgraphData = await this.getDbLiquidityPositions(addresses);

    result.response.uniswapLiquidityPositions = internalSubgraphData.uniswapLiquidityPositions;
    result.response.sushiswapStakingPosition = undefined;
    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      PROJECT_PANCAKE,
    );
  }
}
