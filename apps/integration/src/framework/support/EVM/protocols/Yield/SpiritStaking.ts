import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { MasterChef } from './MasterChef';

export class SpiritStaking extends MasterChef {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
  ) {
    super(abiService, multicall, logger, cache, accountService, priceService);
  }

  functionPredicates: INamedFunctionPredicates = {
    tokens: () => (item) => item.name === 'tokens',
    length: () => (item) => item.name === 'length',
    gauges: () => (item) => item.name === 'gauges',
  };

  protected incentivesFunctionsPredicates: INamedFunctionPredicates = {
    balanceOf: () => (item) => item.name === 'balanceOf',
    earned: () => (item) => item.name === 'earned',
    totalSupply: () => (item) => item.name === 'totalSupply',
  };

  private abiQauges;

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const listPools = context.tokens;

    const calls = listPools.map((p) => {
      return this.getMainContract().createCall(this.functions.gauges, p);
    });
    const registeredTokens = await this.multicall.callArray(calls, this.meta.chain);

    this.abiQauges = await this.abiService.fetchAbi(registeredTokens[0], this.meta.chain);
    const abiTotalSupply = this.abiQauges.find((item) => item.name === 'totalSupply');

    const callsQ = new Map(
      registeredTokens.flatMap((r) => {
        const contract = new DynamicContract(r);
        return [[this.totalSupplyLable(r), contract.createCall(abiTotalSupply)]];
      }),
    );

    const dataPools = await this.multicall.handleInBatches(callsQ, this.meta.chain);

    return listPools.map((pool, idx) => {
      const dataDerivedSupply = dataPools.get(this.totalSupplyLable(registeredTokens[idx])).output
        .data;
      return {
        id: registeredTokens[idx],
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: pool.toLowerCase(),
            },
            totalSupplied: dataDerivedSupply.toString(),
          },
        ],
        rewarded: [
          {
            token: { address: context.rewardToken.toLowerCase() },
          },
        ],
      };
    });
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    const abiBalanceOf = this.abiQauges.find((item) => item.name === 'balanceOf');
    const abiEarned = this.abiQauges.find((item) => item.name === 'earned');

    const calls = new Map(
      pools.flatMap((p) => {
        const contract = new DynamicContract(p.id);
        return [
          [this.earnedInfoLable(p.id, address), contract.createCall(abiEarned, address)],
          [this.balanceInfoLable(p.id, address), contract.createCall(abiBalanceOf, address)],
        ];
      }),
    );

    const userDataInfo = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools
      .map((p) => {
        return this.fromatUserData(address, p, userDataInfo);
      })
      .filter((ub) => ub !== undefined);
  }

  protected fromatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const rewardToken = usersPool.rewarded[0];
    const lpToken = usersPool.supplied[0];

    const userBalance = data.get(this.balanceInfoLable(usersPool.id, address)).output.data;
    const userReward = data.get(this.earnedInfoLable(usersPool.id, address)).output.data;

    if (userBalance.toString() === '0') {
      return;
    }

    const balanceNormalized = normalizeDecimals(userBalance.toString(), lpToken.token.decimals);
    const pendingRewardNormalized = normalizeDecimals(
      userReward.toString(),
      rewardToken.token.decimals,
    );
    const poolShare = balanceNormalized / lpToken.token.totalSupply;
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
    });
    Object.assign(usersPool.rewarded[0], {
      amount: pendingRewardNormalized,
      value: pendingRewardNormalized * rewardToken.token.price,
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

  totalSupplyLable(lpToken) {
    return concatStrings(lpToken, this.incentivesFunctionsPredicates.totalSupply.name);
  }

  earnedInfoLable(poolId, address) {
    return concatStrings(poolId, address, this.incentivesFunctionsPredicates.earned.name);
  }

  balanceInfoLable(poolId, address) {
    return concatStrings(poolId, address, this.incentivesFunctionsPredicates.balanceOf.name);
  }
}
