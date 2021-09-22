import { Injectable } from '@nestjs/common';

import {
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
} from '@app/common/dto/liquidity.position.dto';
import { PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { TokenBalance } from '../common/types/balances';

import { AccountService } from '../account/account.service';
import { EtherscanService } from '../etherscan/etherscan.service';
import { BaseData, UniswapResponseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { LiquidityPoolsEntity } from '../pools/entities/liquidity.pools.entity';
import { PoolsService } from '../pools/pools.service';
import { PancakeSubgraph } from '../thegraph/pancake.subgraph';

@Injectable()
export class PancakeService {
  constructor(
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
      this.poolsService.getProjectPools(PancakeProtocolEnum.pancakeV1),
      this.poolsService.getProjectPools(PancakeProtocolEnum.pancakeV2),
    ]);
    allPools = allPools.concat(pools).concat(poolsV2);

    const liquidityPositions: UniswapResponseData = {
      uniswapLiquidityPositions: new Map<string, IncomeLiquidityPosition[]>(),
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
    balance: TokenBalance,
  ): IncomeLiquidityPosition {
    const token0 = pool.poolTokens.find((t) => t.positionInPool === 0);
    const token1 = pool.poolTokens.find((t) => t.positionInPool === 1);

    const pair: IncomeLiquidityPositionPair = {
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

  async getData(addresses: string): Promise<BaseData[]> {
    const addressesArray = addresses.split(',');

    const internalSubgraphData = await this.getDbLiquidityPositions(addresses);
    const result = {
      userAddresses: addressesArray,
      response: {
        uniswapLiquidityPositions: internalSubgraphData.uniswapLiquidityPositions,
        sushiswapStakingPosition: undefined,
      },
    };

    return this.mapper.mapData(
      result.userAddresses,
      addressesArray,
      result.response,
      ProjectEnum.pancake,
    );
  }
}
