import { Injectable } from '@nestjs/common';

import { Address } from '../common/types';
import { ChainIdEnum, PancakeProtocolEnum, ProjectEnum } from 'src/common/enum';
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
import { TokenDto } from '../pools/dto/token.dto';
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

  private static createToken(token: TokenDto) {
    return {
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals.toString(),
    };
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
      totalSupply: pool.token.totalSupply.toString(),
      reserveUSD: pool.reserveUsd.toString(),
      reserve0: token0.reserve.toString(),
      token0: PancakeService.createToken(token0),
      token0Price: '0',
      reserve1: token1.reserve.toString(),
      token1: PancakeService.createToken(token1),
      token1Price: '0',
    };

    return {
      liquidityTokenBalance: balance.decimalsAmount.toString(),
      user: user,
      pair: pair,
    };
  }

  public async getDataByAddresses(
    addresses: Address,
    chainId: ChainIdEnum,
    pancakeVersion: PancakeProtocolEnum,
  ): Promise<BaseData[]> {
    const addressesArray = addresses.split(',');

    const internalSubgraphData = await this.getDbLiquidityPositions(addresses, pancakeVersion);

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

  private async getDbLiquidityPositions(
    addresses: Address,
    pancakeVersion: PancakeProtocolEnum,
  ): Promise<UniswapResponseData> {
    const addressesArray: Address[] = addresses.split(',');

    const [balances, pools] = await Promise.all<BalancesResponse, LiquidityPoolsResponseDto[]>([
      this.etherscanService.getBalances(addressesArray),
      this.poolsService.getProjectPools(pancakeVersion),
    ]);

    const lpMap = new Map<Address, IncomeLiquidityPosition[]>();

    balances.forEach((balance, address) => {
      balance.tokens.forEach((t) => {
        const pool = pools.find((p) => p.address === t.token.token.address); // TODO m.b. Map? on the fly cycle
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
