import { Injectable } from '@nestjs/common';

import { PancakeProtocolEnum, ProjectEnum } from 'src/common/enum';
import { TokenBalance } from 'src/common/types/balances';

import { AccountService } from '../account/account.service';
import {
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
} from '../dto/liquidity.position.dto';
import { EtherscanService } from '../etherscan/etherscan.service';
import { BalancesResponse } from '../etherscan/interfaces';
import { BaseData, UniswapResponseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { LiquidityPoolsResponseDto } from '../pools/dto/liquidity.pools.response.dto';
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

  public async getDataByAddresses(addresses: string): Promise<BaseData[]> {
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

  private async getDbLiquidityPositions(addresses: string): Promise<UniswapResponseData> {
    const addressesArray: string[] = addresses.split(',');

    const [poolsV1, poolsV2, balances] = await Promise.all<
      LiquidityPoolsResponseDto[],
      LiquidityPoolsResponseDto[],
      BalancesResponse
    >([
      this.poolsService.getProjectPools(PancakeProtocolEnum.pancakeV1),
      this.poolsService.getProjectPools(PancakeProtocolEnum.pancakeV2),
      this.etherscanService.getBalances(addressesArray),
    ]);

    const allPools: LiquidityPoolsEntity[] = [...poolsV1, ...poolsV2];

    const lpMap = new Map<string, IncomeLiquidityPosition[]>();
    balances.forEach((balance, address) => {
      balance.tokens.forEach((t) => {
        const pool = allPools.find((p) => p.address === t.token.token.address); // TODO m.b. Map? on the fly cycle
        if (pool) {
          let lps = lpMap.get(address);
          if (!lps) {
            lps = [];
            lpMap.set(address, lps);
          }
          lps.push(PancakeService.createLiquidityPosition(address, pool, t.token));
        }
      });
    });
    const liquidityPositions: UniswapResponseData = {
      uniswapLiquidityPositions: lpMap,
    };

    return liquidityPositions;
  }
}
