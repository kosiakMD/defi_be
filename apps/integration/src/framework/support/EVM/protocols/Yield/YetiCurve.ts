import { YetiAssetService } from 'apps/integration/src/modules/microservices/yeti.asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals, startsWith } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FeatureEnum } from '../../../enums';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
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
    protected assetService: YetiAssetService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
    totalSupply: () => (item) => item.name === 'totalSupply',
  };

  curvePredicates: INamedFunctionPredicates = {
    reserve: () => (item) => item.name === 'get_balances',
  };

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

    const supply = this.modifyUserEntrySupplied(pool.supply, tokenAmount);

    const reward = {
      ...pool.reward,
      amount: rewardAmount,
      value: rewardAmount * pool.reward.token.price,
    };

    return { ...pool, supply, reward };
  }

  // TODO remove it once assets service will done
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

  // TODO remove it once assets service will done
  protected getOpportunityTVL(opportunity: IStakingFeatureMinimalSingle, tokens: TokenMap): number {
    const token = tokens.get(opportunity.supply.token.address);
    const totalSupplied = normalizeDecimals(opportunity.supply.totalSupplied, token.decimals);
    const tvl = token.underlying.reduce((prev, next) => prev + next.totalSupply * next.price, 0);
    token.price = tvl / totalSupplied;

    return tvl;
  }

  // TODO remove it once assets service will done
  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal<unknown>,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);
    const apy = this.formatSupplyApy?.(supplied);
    token.totalSupply = totalSupplied;
    return {
      token,
      apy,
      tvl: totalSupplied * token.price,
    };
  }

  protected modifyUserEntrySupplied(supplied: ISupplyTokenOpportunity, balance: number) {
    const poolShare = balance / supplied.token.totalSupply;
    supplied.token.underlying?.forEach((underlying) => {
      underlying.balance = underlying.totalSupply * poolShare;
      underlying.value = underlying.balance * underlying.price;
    });

    return Object.assign(supplied, {
      amount: balance,
      value: balance * supplied.token.price,
    });
  }
}
