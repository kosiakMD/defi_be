import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { equals, normalizeDecimals, regex, startsWith } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface IYetiCurveMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string;
  context: {
    stakedToken: Address;
    rewardToken: Address;
  };
}

type IStakingFeatureMinimalSingle = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  void
>;

// User-less opportunities (getOpportunities)
type IStakingFeatureOpportunitySingle = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  void
>;

// User Info (getUserPositions)
type IStakingFeatureUserEntrySingle = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  void
>;

export class YetiCurve
  extends SingleContractProtocol<
    IStakingFeatureMinimalSingle,
    IStakingFeatureOpportunitySingle,
    IStakingFeatureUserEntrySingle,
    IYetiCurveMeta
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
  ) {
    super();
    if (this.updateFunctionPredicates) {
      this.updateFunctionPredicates();
    }
  }

  protected updateFunctionPredicates?(): void;

  functionPredicates: INamedFunctionPredicates = {
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
    totalSupply: () => (item) => item.name === 'totalSupply',
  };

  curvePredicates: INamedFunctionPredicates = {
    reserve: () => (item) => item.name === 'get_balances',
  };

  /**
   * fetches all available pools on this protocol
   *
   * @param context hardcoded data & some multicall/web3 data
   * @returns full pools array
   */
  protected async fetchOpportunityData(
    context: Record<string, any>,
  ): Promise<IStakingFeatureMinimalSingle[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: { address: context.stakedToken },
          totalSupplied: context.totalSupply.toString(),
        },
        reward: {
          token: { address: context.rewardToken },
        },
      },
    ];
  }

  protected balanceOfLabel(address: Address, user: Address) {
    return `${address}.balanceOf(${user})`;
  }

  protected pendingRewardsLabel(address: Address, user: Address): string {
    return `${address}.pendingRewards(${user})`;
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunitySingle[],
  ): Promise<IStakingFeatureUserEntrySingle[]> {
    const contract = this.getMainContract();

    const calls = new Map();
    pools.forEach((pool) => {
      calls.set(
        this.balanceOfLabel(pool.id, address),
        contract.createCall(this.functions.userInfo, address),
      );
      calls.set(
        this.pendingRewardsLabel(pool.id, address),
        contract.createCall(this.functions.pendingRewards, address),
      );
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunitySingle,
    data: any,
  ): IStakingFeatureUserEntrySingle {
    const {
      output: { data: balanceRaw },
    } = data.get(this.balanceOfLabel(pool.id, address));
    const {
      output: { data: rewardRaw },
    } = data.get(this.pendingRewardsLabel(pool.id, address));

    const tokenAmount = normalizeDecimals(balanceRaw[0].toString(), pool.supply.token.decimals);
    const rewardAmount = normalizeDecimals(rewardRaw.toString(), pool.supply.token.decimals);

    if (!tokenAmount) return;

    const supply = {
      ...pool.supply,
      amount: tokenAmount,
      value: tokenAmount * pool.supply.token.price,
    };

    const reward = {
      ...pool.reward,
      amount: rewardAmount,
      value: rewardAmount * pool.reward.token.price,
    };

    return { ...pool, supply, reward };
  }

  protected async getTokens(addresses: string[]): Promise<[string, ERC20Token][]> {
    const tokens = await super.getTokens(addresses);

    const curveIndex = tokens.findIndex((x) => x[0] === this.meta.context.stakedToken);
    const contract = new DynamicContract(tokens[curveIndex][0]);

    const curveFunctions = await this.abiService.parseFunctionsFromAddress(
      tokens[curveIndex][0],
      this.meta.chain,
      this.curvePredicates,
    );

    const curveReserveCall = contract.createCall(curveFunctions.reserve);
    const curveInfo = await this.multicall.callArray([curveReserveCall], this.meta.chain);

    tokens[curveIndex][1].underlying.forEach((token) => {
      token.totalSupply = normalizeDecimals(curveInfo[0][token.position], token.decimals);
      return token;
    });

    return tokens;
  }
}
