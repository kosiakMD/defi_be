// eslint-disable-next-line max-classes-per-file
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CallData } from '@app/common/dto/CallData';
import { aprToApy, dataFrom, normalizeDecimals, second, toBN } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { FakeAssetService } from '../../../../../modules/microservices/fake.asset.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { IRewardRates } from '../../../interfaces/rewards.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

const NULL_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export interface IBancorLiquidityMeta extends IProtocolMeta {
  address: Address;
  minUSDLiquidity: number;
  poolsApi: string;
}

interface IBancorPool {
  dlt_id: string; // pool address, not lp token
  liquidity: {
    usd: string;
  };
  fees_24h: {
    usd: string;
  };
  reserves: {
    dlt_id: string;
    balance: {
      usd: string; // in fact this is underlying token balance (reserve)
    };
  }[];
}

type IRewardExtra = {
  apr: number;
  apy: number;
};

export type IRewardBTokenMinimal = IRewardTokenMinimal<IRewardExtra>;
export type IPoolFeatureMinimal = BaseWithTokens<ISupplyTokenMinimal[], IRewardBTokenMinimal[]>;

export class BancorSingleSideLiquidity
  extends SingleContractProtocol<
    IPoolFeatureMinimal,
    IPoolFeatureOpportunity,
    IPoolFeatureUser,
    IBancorLiquidityMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected assetService: FakeAssetService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected multicall: MulticallAggregator,
    protected abiService: AbiService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    liquidityIds: () => (item) => item.name === 'protectedLiquidityIds',
    protectedLiquidity: () => (item) => item.name === 'protectedLiquidity',
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected fetchOpportunityData(context): Promise<IPoolFeatureMinimal[]> {
    const $data = this.httpService.get(this.meta.poolsApi).pipe(
      mergeMap((rsp) => {
        return rsp.data.data.reduce((list, pool) => {
          const isPoolHasMinLiquidity = Number(pool.liquidity.usd) > this.meta.minUSDLiquidity;
          if (isPoolHasMinLiquidity) {
            list.push(this.toFeatureEntryMinimal(pool));
          }
          return list;
        }, []);
      }),
      toArray(),
    );
    return firstValueFrom($data) as Promise<IPoolFeatureMinimal[]>;
  }

  private toFeatureEntryMinimal(pool: IBancorPool): IPoolFeatureMinimal {
    let apr = 0;
    if (Number(pool.liquidity.usd) > 0) {
      apr = (Number(pool.fees_24h.usd) * 365) / Number(pool.liquidity.usd);
    }
    return {
      id: 'pool' + '::' + pool.dlt_id.toLowerCase(),
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: pool.reserves.map((r) => {
        return {
          token: { address: this.formatTokenAddress(r.dlt_id.toLowerCase()) },
          totalSupplied: r.balance.usd,
        };
      }),
      rewarded: pool.reserves.map((r) => {
        return {
          token: { address: this.formatTokenAddress(r.dlt_id.toLowerCase()) },
          extra: {
            apr: apr,
            apy: aprToApy(apr, 52), // every week
          },
        };
      }),
    };
  }

  protected formatTokenAddress(address: Address): Address {
    address = address.toLowerCase();
    if (address === NULL_ADDRESS) {
      return ZERO_ADDRESS;
    }
    return address;
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal<unknown>,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    return {
      token,
      tvl: Number(supplied.totalSupplied) * token.price,
    };
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardBTokenMinimal,
    token: ERC20Token,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tvl: number, // for calculating apr
  ): IRewardTokenOpportunity {
    return {
      token,
      harvests: fromYearRate(0),
      apr: fromYearRate(poolToken.extra.apr),
      apy: fromYearRate(poolToken.extra.apy),
      rewardedForLendingSide: poolToken.rewardedForLendingSide,
      rewardedForTokenAddress: poolToken.rewardedForTokenAddress,
    };
  }

  protected async fetchUserData(
    address: Address,
    pools: IPoolFeatureOpportunity[],
  ): Promise<IPoolFeatureUser[]> {
    const calls = new Map<string, CallData>();
    calls.set(
      Labels.liquidityIds(this.meta.address, address),
      plainToClass(CallData, {
        address: this.meta.address,
        abi: this.functions.liquidityIds,
        input: {
          data: [address],
        },
      }),
    );
    const liquidityIdsData = await this.multicall.handleInBatches(calls, this.meta.chain);
    let idsFormatted: number[] = dataFrom(
      liquidityIdsData,
      Labels.liquidityIds(this.meta.address, address),
    );

    idsFormatted = idsFormatted.map(Number);
    // in case of one by on request it is safe to rewrite it
    const callsArray: CallData[] = idsFormatted.map((id) => {
      return plainToClass(CallData, {
        address: this.meta.address,
        abi: this.functions.protectedLiquidity,
        input: {
          data: [id],
        },
      });
    });

    const liquidityPositionsData = await this.multicall.callArray(callsArray, this.meta.chain);
    const liquidityBalances = liquidityPositionsData.reduce((balances, position) => {
      const poolAddress = position['1'].toLowerCase();
      const assetAddress = this.formatTokenAddress(position['2'].toLowerCase());
      const balance = position['4'];
      if (balances[poolAddress] === undefined) {
        balances[poolAddress] = {};
      }
      if (balances[poolAddress][assetAddress] === undefined) {
        balances[poolAddress][assetAddress] = toBN(0);
      }
      balances[poolAddress][assetAddress] = balances[poolAddress][assetAddress].plus(balance);
      return balances;
    }, {});

    return pools.reduce((positions, pool) => {
      const poolAddress = second(pool.id.split('::'));
      const balances = liquidityBalances[poolAddress];
      if (!balances) {
        return positions;
      }

      const userPosition: IPoolFeatureUser = {
        feature: pool.feature,
        id: pool.id,
        chain: pool.chain,
        links: pool.links,
        supplied: pool.supplied.map((st) => {
          const balance = normalizeDecimals(balances[st.token.address], st.token.decimals);
          return {
            token: st.token,
            tvl: st.tvl,
            amount: balance,
            value: balance * st.token.price,
          };
        }),
      };
      return [...positions, userPosition];
    }, []);
  }
}

export function fromYearRate(rate: number): IRewardRates {
  return {
    year: rate,
    month: rate / 12,
    week: rate / 52,
    day: rate / 365,
  };
}

class Labels {
  static liquidityIds(contractAddress: string, accountAddress: string) {
    return `${contractAddress}_liquidityIds(${accountAddress})`;
  }
}
