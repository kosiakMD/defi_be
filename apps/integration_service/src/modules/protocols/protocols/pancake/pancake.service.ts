import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  AutomaticMarketMaker,
  ChainDto,
  FeatureEnum,
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  TokenBalance,
  UniswapSubgraphLikeData,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/dto/liquidity.pool.dto';

import { AccountService } from '../../../microservices/account.service';
import { PancakeSubgraph } from '../../../subgraphs/subgraphs/pancake.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import { LiquidityPoolsResponseDto } from './dto/liquidity.pools.response.dto';
import { TokenDto } from './dto/token.dto';
import { EtherscanService } from './etherscan.service';
import { PoolsService } from './pools.service';

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
    pool: LiquidityPoolsResponseDto,
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
    addresses: Address[],
    chain: ChainDto,
    pancakeVersion: PancakeProtocolEnum,
  ): Promise<BaseData[]> {
    const internalSubgraphData = await this.getDbLiquidityPositions(addresses, pancakeVersion);
    const result = {
      userAddresses: addresses,
      response: {
        subgraphPools: internalSubgraphData.subgraphPools,
        subgraphStaking: undefined,
      },
    };

    const v1Response = await this.mapper.mapData(
      result.userAddresses,
      addresses,
      result.response,
      ProjectEnum.pancake,
      PancakeProtocolEnum.pancakeV1,
      chain,
    );

    return this.convertToV2Response(v1Response, chain);
  }

  private convertToV2Response(mapResult: BaseData[], chain: ChainDto) {
    return mapResult.map((base) => {
      const existedPositions = (base as AutomaticMarketMaker).liquidityPositions
        .filter((position) => Number(position.lpTokenBalance) > 0)
        .map((position) => {
          return plainToClass(LiquidityPoolFeature, {
            address: position.pool.address,
            name: position.pool.name,
            lpToken: position.lpToken,
            tokens: position.poolTokens.map((token) => {
              return plainToClass(PoolTokenDto, {
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                reserve: token.reserve,
                weight: token.percentage,
                price: null,
                balance: token.amount,
                value: null,
              });
            }),
          });
        });
      return plainToClass(BaseDataLp, {
        chain: chain,
        userAddress: base.userAddress,
        protocolType: ProtocolTypeEnum.amm,
        projectName: ProjectEnum.pancake,
        items: existedPositions,
        feature: FeatureEnum.pools,
      });
    });
  }

  private async getDbLiquidityPositions(
    addresses: Address[],
    pancakeVersion: PancakeProtocolEnum,
  ): Promise<UniswapSubgraphLikeData> {
    const [balances, pools = []] = await Promise.all([
      this.etherscanService.getBalances(addresses),
      this.poolsService.getProjectPools(pancakeVersion),
    ]);

    const poolsMap = new Map<string, LiquidityPoolsResponseDto>();
    pools.forEach((pool) => poolsMap.set(pool.address, pool));

    const lpMap = new Map<Address, IncomeLiquidityPosition[]>();

    balances.forEach((balance, address) => {
      balance.tokens.forEach((t) => {
        const pool = poolsMap.get(t.token.token.address);
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

    return {
      subgraphPools: lpMap,
    };
  }
}
