import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  UniswapLiquidityPosition,
  UniswapLiquidityPositionPair,
} from '@app/common/dto/liquidity.position.dto';
import { ChainIdEnum, ProjectEnum, ProtocolNameEnum } from '@app/common/enum';

import { AccountService } from '../account/account.service';
import { UniswapToken } from '../interfaces/entity.information.interfaces';
import { BaseData, UniswapResponseData } from '../interfaces/transactions.interfaces';
import { NotifyPayloadFeaturesDto } from '../jobs/notify.payload.features.dto';
import { Mapper } from '../mappers/mapper';

@Injectable()
export class SpookyswapService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly accountService: AccountService,
    private readonly mapper: Mapper,
  ) {}

  async getDataByAddresses(addresses: string): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const pools: NotifyPayloadFeaturesDto = await this.cache.get('4_SpookySwap_pools');
    const balances = await this.accountService.getBalancesCovalent(originAddressesArray, [
      ChainIdEnum.ftm,
    ]);
    return this.mapper.mapData(
      Object.keys(balances),
      originAddressesArray,
      this.mapToUniswapResponseData(originAddressesArray, pools, balances),
      ProjectEnum.spookyswap,
      ProtocolNameEnum.SpookySwap,
    );
  }

  private mapToUniswapResponseData(originAddressesArray, pools, balances): UniswapResponseData {
    return {
      uniswapLiquidityPositions: this.mapToUniswapLiquidityPosition(
        originAddressesArray,
        pools,
        balances,
      ),
    };
  }

  private mapToUniswapLiquidityPosition(
    originAddressesArray,
    pools,
    balances,
  ): Map<string, UniswapLiquidityPosition[]> {
    const uniswapLiquidityPositions = new Map<string, UniswapLiquidityPosition[]>();
    const lpTokenAddresses = pools.items.map((pool) => pool.address.toLowerCase());

    originAddressesArray.forEach((userAddress) => {
      const rawPositions = balances[userAddress.toLowerCase()].tokens
        .filter((balance: any): boolean => {
          return lpTokenAddresses.includes(balance.token.address.toLowerCase());
        })
        .map((balance: any): UniswapLiquidityPosition => {
          const pool = pools.items.find(
            (p: any) => p.address.toLowerCase() === balance.token.address.toLowerCase(),
          );
          return plainToClass(UniswapLiquidityPosition, {
            liquidityTokenBalance: balance.decimalsAmount.toString(),
            user: balance.account,
            pair: plainToClass(UniswapLiquidityPositionPair, {
              id: pool.address,
              reserve0: pool.tokens[0].reserve,
              reserve1: pool.tokens[1].reserve,
              reserveUSD: pool.TVL * 1e18,
              token0: plainToClass(UniswapToken, {
                decimals: pool.tokens[0].decimals,
                id: pool.tokens[0].address,
                name: pool.tokens[0].name,
                symbol: pool.tokens[0].symbol,
                percentage: pool.tokens[0].percentage,
              }),
              token0Price: pool.tokens[0].price,
              token1: plainToClass(UniswapToken, {
                decimals: pool.tokens[1].decimals,
                id: pool.tokens[1].address,
                name: pool.tokens[1].name,
                symbol: pool.tokens[1].symbol,
                percentage: pool.tokens[1].percentage,
              }),
              token1Price: pool.tokens[1].price,
              totalSupply: pool.lpToken.totalSupply,
            }),
          });
        });

      uniswapLiquidityPositions.set(userAddress.toLowerCase(), rawPositions);
    });

    return uniswapLiquidityPositions;
  }
}
