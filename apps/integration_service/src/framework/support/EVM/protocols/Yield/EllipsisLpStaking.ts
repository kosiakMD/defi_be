import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { absoluteValue, dataFrom, equals, normalizeDecimals, startsWith } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { CurveAssetsManager } from '../../../assets/curve.assets.manager';
import { FeatureEnum } from '../../../enums';
import { MissingTokenException } from '../../../exceptions';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardRates,
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenMinimal } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface IEllipsisLPStakingMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  context: {
    aprUrl: string;
  };
  links: {
    getOpportunityLink: (opportunity) => string;
  };
}

export type EllipsisExtraData = {
  minter: string;
  id: number;
  apr: number;
  aprMax: number;
};
export type IStakingFeatureMinimalEllipsis = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  EllipsisExtraData
>;

export class EllipsisLpStaking
  extends SingleContractProtocol<
    IStakingFeatureMinimalEllipsis,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IEllipsisLPStakingMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected assetsManager: CurveAssetsManager,
    protected httpService: HttpService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    rewardToken: () => (item) => equals(item.name, 'rewardToken'),
    registeredTokens: () => (item) => equals(item.name, 'registeredTokens'),
    poolInfo: () => (item) => equals(item.name, 'poolInfo'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => startsWith(item.name, 'claimable'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    context.rewardToken = context.rewardToken.toLowerCase();

    return context;
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimalEllipsis[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());
    const registeredTokens: string[] = await this.fetchRegisteredTokens(poolIds);
    const poolInfos: IPoolInfo[] = await this.fetchPoolInfos(registeredTokens);
    const minters: string[] = await this.assetsManager.fetchMinters(
      registeredTokens,
      this.meta.chain,
    );
    const totalStakedPerPool = await this.fetchTokenBalances(registeredTokens);
    return poolInfos.map((poolInfo, idx) => {
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        poolIds[idx],
        minters[idx],
        registeredTokens[idx],
        totalStakedPerPool[idx],
        context,
      );
    });
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: IPoolInfo,
    poolId: number,
    minter: string,
    registeredToken: string,
    totalStaked: BN,
    context: { [key: string]: any },
  ): IStakingFeatureMinimalEllipsis {
    return {
      id: `${this.meta.address}::${poolId}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: registeredToken,
          },
          totalSupplied: totalStaked.toString(),
        },
      ],
      rewarded: [
        {
          token: { address: context.rewardToken },
          rewardPerSecond: poolInfo.rewardsPerSecond.toString(),
        },
      ],
      meta: {
        id: poolId,
        minter,
        apr: 0,
        aprMax: 0,
      },
    };
  }

  protected async updateRealTimeData(
    opportunities: IStakingFeatureMinimalEllipsis[],
  ): Promise<IStakingFeatureMinimalEllipsis[]> {
    const poolsAPIData = await this.httpService
      .get(this.meta.context.aprUrl)
      .pipe(map((response) => response.data?.data))
      .toPromise()
      .catch(() => {
        return {};
      });
    return opportunities.map((op) => {
      let poolData;
      Object.keys(poolsAPIData).forEach((key) => {
        if (poolsAPIData[key].address?.toLowerCase() === op.meta.minter) {
          poolData = poolsAPIData[key];
        }
      });
      // console.log(op);
      // console.log(poolData);
      if (!poolData) {
        return op;
      }
      const apr = Number(+poolData.rewardsApr + +poolData.baseApr + +poolData.aprWithoutBoost);
      const aprMax = Number(+poolData.rewardsApr + +poolData.baseApr + +poolData.aprWithBoost);
      // console.log('apr:' + apr)
      // console.log('aprMax:' + aprMax)
      return {
        ...op,
        meta: {
          ...op.meta,
          apr: absoluteValue(apr),
          aprMax: absoluteValue(aprMax),
        },
      };
    });
  }

  /**
   * Converts a minimal entry into a full opportunity entry
   *
   * @param opportunity A specific opportunity
   * @param tokens map of all tokens (and token details) keyed by token address
   */
  protected formatOpportunity(
    opportunity: IStakingFeatureMinimalEllipsis,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunity {
    const base: any = {
      id: opportunity.id,
      feature: opportunity.feature,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
    };

    base.supplied = opportunity.supplied.map((poolToken) => {
      const token = tokens.get(poolToken.token.address);
      if (!token) {
        throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
      }

      return this.formatOpportunitySuppliedToken(poolToken, token);
    });

    base.rewarded = opportunity.rewarded.map((poolToken) => {
      const token = tokens.get(poolToken.token.address);
      if (!token) {
        throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
      }

      return this.formatOpportunityRewardedTokenData(poolToken, token, opportunity.meta);
    });

    return base;
  }

  protected formatOpportunityRewardedTokenData(
    poolToken: IRewardTokenMinimal,
    token: ERC20Token,
    meta: EllipsisExtraData,
  ): IRewardTokenOpportunity {
    const tokensPerSecond = normalizeDecimals(poolToken.rewardPerSecond, token.decimals);

    const { apr: harvests } = this.getYieldBreakdown(tokensPerSecond, 1);
    const { apr, apy } = this.getYieldBreakdownFromAPR(meta.apr);
    const { apr: aprMax, apy: apyMax } = this.getYieldBreakdownFromAPR(meta.aprMax);

    return {
      token,
      harvests,
      apr,
      aprMax,
      apy,
      apyMax,
    };
  }

  protected getYieldBreakdownFromAPR(aprTotal: number) {
    const perDay = aprTotal / 365;
    const apr: IRewardRates = {
      day: perDay,
      week: perDay * 7,
      month: perDay * 30,
      year: perDay * 365,
    };

    // set APY to same as APR because not possible to get APY
    return {
      apr,
      apy: apr,
    };
  }

  protected async fetchRegisteredTokens(poolIds: number[]): Promise<string[]> {
    const contract = this.getMainContract();
    const registeredTokensCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.registeredTokens, poolId);
    });
    const registeredTokens = await this.multicall.callArray(registeredTokensCalls, this.meta.chain);
    return registeredTokens.map((tAddress) => tAddress.toLowerCase());
  }

  protected async fetchPoolInfos(tokenAddresses: string[]): Promise<IPoolInfo[]> {
    const contract = this.getMainContract();

    const poolInfoCalls = tokenAddresses.map((tokenAddress) => {
      return contract.createCall(this.functions.poolInfo, tokenAddress);
    });

    const poolInfos = await this.multicall.callArray(poolInfoCalls, this.meta.chain);
    return poolInfos.map((pool, index) => {
      // todo: can be refactored
      return {
        id: undefined,
        registeredToken: tokenAddresses[index],
        adjustedSupply: pool['adjustedSupply'],
        rewardsPerSecond: pool['rewardsPerSecond'],
        lastRewardTime: pool['lastRewardTime'],
        accRewardPerShare: pool['accRewardPerShare'],
      };
    });
  }

  protected async fetchTokenBalances(tokenAddresses: string[]) {
    const totalStakedCalls = tokenAddresses.map((tAddress) => {
      const lpContract = new ERC20(tAddress);
      return lpContract.balanceOf(this.meta.address);
    });

    return this.multicall.callArray(totalStakedCalls, this.meta.chain);
  }

  protected async getTokens(addresses: Address[]): Promise<[Address, ERC20Token][]> {
    return await this.assetsManager.getTokens(addresses, this.meta.chain);
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    const contract = this.getMainContract();

    const calls = new Map();
    pools.forEach((pool) => {
      const lpToken = pool.supplied[0];
      calls.set(
        userInfoLabel(contract.address, lpToken.token.address, address),
        contract.createCall(this.functions.userInfo, lpToken.token.address, address),
      );
      calls.set(
        pendingRewardsLabel(contract.address, address, lpToken.token.address),
        contract.createCall(this.functions.pendingRewards, address, [lpToken.token.address]),
      );
    });

    const userBalances = await this.multicall.handleInBatches(calls, this.meta.chain);
    return pools
      .map((p) => {
        return this.formatUserData(address, p, userBalances);
      })
      .filter((ub) => ub !== undefined);
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const lpToken = usersPool.supplied[0];
    const rewardToken = usersPool.rewarded[0];
    const userBalance: IUserInfo = dataFrom(
      data,
      userInfoLabel(this.getMainContract().address, lpToken.token.address, address),
    );
    const pendingRewards: BN = dataFrom(
      data,
      pendingRewardsLabel(this.getMainContract().address, address, lpToken.token.address),
    );
    // return if no balance
    if (userBalance.depositAmount.isZero()) {
      return;
    }
    const balanceNormalized = normalizeDecimals(
      userBalance.depositAmount.toString(),
      lpToken.token.decimals,
    );
    const pendingRewardsNormalized = normalizeDecimals(
      pendingRewards.toString(),
      rewardToken.token.decimals,
    );

    const poolShare = balanceNormalized / lpToken.token.totalSupply;
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
    });
    Object.assign(usersPool.rewarded[0], {
      amount: pendingRewardsNormalized,
      value: pendingRewardsNormalized * rewardToken.token.price,
    });

    usersPool.supplied[0].token.underlying = usersPool.supplied[0].token.underlying.map((u) => {
      return this.formatUnderlyingTokens(u, poolShare);
    });

    return usersPool as IStakingFeatureUserEntry;
  }

  formatUnderlyingTokens(poolToken: ERC20Token, poolShare: number) {
    const balance = poolToken.reserve * poolShare;
    if (poolToken.underlying) {
      poolToken.underlying = poolToken.underlying.map((pt) => {
        const underlyingPoolShare = poolToken.balance / poolToken.totalSupply;
        return this.formatUnderlyingTokens(pt, underlyingPoolShare);
      });
    }
    return {
      ...poolToken,
      balance: balance,
      value: balance * poolToken.price,
    };
  }
}

interface IPoolInfo {
  adjustedSupply: BN;
  rewardsPerSecond: BN;
  lastRewardTime: BN;
  accRewardPerShare: BN;
}

interface IUserInfo {
  depositAmount: BN;
  adjustedAmount: BN;
  rewardDebt: BN;
  claimable: BN;
}

function userInfoLabel(lpStaker: Address, lpToken: Address, user: Address): string {
  return `${lpStaker}.userInfo(${lpToken}, ${user})`;
}

function pendingRewardsLabel(lpStaker: Address, user: Address, lpToken: Address): string {
  return `${lpStaker}.pendingRewards(${user}, ${lpToken})`;
}
