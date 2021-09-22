import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolNameEnum,
  SpookySwapProtocolEnum,
} from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import {
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
} from '../../dto/liquidity.position.dto';
import { IncomeToken } from '../../interfaces/entity.information.interfaces';
import { BaseData, UniswapResponseData } from '../../interfaces/transactions.interfaces';
import { NotifyPayloadFeaturesDto } from '../../jobs/notify.payload.features.dto';
import { Mapper } from '../../mappers/mapper';
import { PriceService } from '../../price/price.service';
// import { SpookyswapService } from '../../spookyswap/spookyswap.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class SpookySwapProtocol extends BasicProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.ftm];
  readonly project = ProjectEnum.spookyswap;
  readonly name = SpookySwapProtocolEnum.SpookySwap;
  readonly displayName = 'SpookySwap';
  readonly features = {
    [ChainAbbrEnum.ftm]: [FeatureEnum.pools],
  };
  protected dataProvider;
  protected feeRate: 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    // private readonly spookyswapService: SpookyswapService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
  ) {
    super();
    // this.dataProvider = spookyswapService;
  }

  protected async getData(addresses: string): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const pools: NotifyPayloadFeaturesDto = await this.cache.get('4_SpookySwap_pools');
    // const pools = [];
    const balances = await this.accountService.getBalances(originAddressesArray, [ChainIdEnum.ftm]);

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
  ): Map<string, IncomeLiquidityPosition[]> {
    const uniswapLiquidityPositions = new Map<string, IncomeLiquidityPosition[]>();
    const lpTokenAddresses = pools.items.map((pool) => pool.address.toLowerCase());

    originAddressesArray.forEach((userAddress) => {
      const rawPositions = balances[userAddress.toLowerCase()].tokens
        .filter((balance: any): boolean => {
          return lpTokenAddresses.includes(balance.token.address.toLowerCase());
        })
        .map((balance: any): IncomeLiquidityPosition => {
          const pool = pools.items.find(
            (p: any) => p.address.toLowerCase() === balance.token.address.toLowerCase(),
          );
          return plainToClass(IncomeLiquidityPosition, {
            liquidityTokenBalance: balance.decimalsAmount.toString(),
            user: balance.account,
            pair: plainToClass(IncomeLiquidityPositionPair, {
              id: pool.address,
              reserve0: pool.tokens[0].reserve,
              reserve1: pool.tokens[1].reserve,
              reserveUSD: pool.TVL * 1e18,
              token0: plainToClass(IncomeToken, {
                decimals: pool.tokens[0].decimals,
                id: pool.tokens[0].address,
                name: pool.tokens[0].name,
                symbol: pool.tokens[0].symbol,
                percentage: pool.tokens[0].percentage,
              }),
              token0Price: pool.tokens[0].price,
              token1: plainToClass(IncomeToken, {
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

export default SpookySwapProtocol;
