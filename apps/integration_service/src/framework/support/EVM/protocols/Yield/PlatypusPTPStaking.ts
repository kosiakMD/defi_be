import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { equals, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
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

interface IPlatypusPTPStakingMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  PTP: Address;
  vePTP: Address;
}

export class PlatypusPTPStaking
  // TODO: Maybe add caching as another interface?
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IPlatypusPTPStakingMeta
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
  }

  protected functionPredicates: INamedFunctionPredicates = {
    stakedAmount: () => (item) => equals(item.name, 'getStakedPtp'),
    pendingRewards: () => (item) => equals(item.name, 'claimable'),
    rewardPerSecond: () => (item) => equals(item.name, 'generationRate'),
  };

  protected async fetchOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const [totalSupplied, rewardPerSecond] = await this.multicall.callArray(
      [
        new DynamicContract(this.meta.PTP).createCall(ERC20.balanceOf, this.meta.vePTP),
        new DynamicContract(this.meta.vePTP).createCall(this.functions.rewardPerSecond),
      ],
      this.meta.chain,
    );

    return [
      {
        feature: FeatureEnum.staking,
        chain: this.meta.chain,
        supplied: [
          {
            token: { address: this.meta.PTP },
            totalSupplied,
          },
        ],
        rewarded: [
          {
            token: { address: this.meta.vePTP },
            rewardPerSecond,
          },
        ],
      },
    ];
  }

  protected formatOpportunity(
    pool: IStakingFeatureMinimal,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunity {
    const [supplied] = pool.supplied;
    const [rewarded] = pool.rewarded;

    if (!tokens.has(supplied.token.address)) {
      this.logger.warn(`Missing staked token info`, this.constructor.name);
      return;
    }

    if (!tokens.has(rewarded.token.address)) {
      this.logger.warn(`Missing rewarded token info`, this.constructor.name);
      return;
    }

    // TODO: Copied from MasterChef, think if it could be shared
    const tvl = pool.supplied.reduce((tvl, poolToken) => {
      const token = tokens.get(poolToken.token.address);
      return tvl + token.price * normalizeDecimals(poolToken.totalSupplied, token.decimals);
    }, 0);

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      supplied: pool.supplied.map((poolToken) =>
        this.formatOpportunitySuppliedToken(poolToken, tokens.get(poolToken.token.address)),
      ),

      rewarded: pool.rewarded.map((poolToken) =>
        this.formatOpportunityRewardedToken(poolToken, tokens.get(poolToken.token.address), tvl),
      ),
    };
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(poolToken.totalSupplied, token.decimals);
    const totalSupply = normalizeDecimals(poolToken.totalSupply, token.decimals);
    return {
      token,
      totalSupply,
      totalSupplied,
      tvl: totalSupplied * token.price,
    };
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardTokenMinimal,
    token: ERC20Token,
    tvl: number, // for calculating apr
  ): IRewardTokenOpportunity {
    const tokensPerSecond = normalizeDecimals(poolToken.rewardPerSecond, token.decimals);
    const pricePerSecond = tokensPerSecond * token.price;

    // yield is a reserved word 🙄
    const { apr: harvests } = this.getYieldBreakdown(tokensPerSecond, 1);
    const { apr, apy } = this.getYieldBreakdown(pricePerSecond, tvl);

    return {
      token,
      harvests,
      // Note: This only includes APR for _this token's rewards_ on the farm
      // so any trading fees are not included here
      apr,
      apy,
    };
  }

  // TODO: Add typing as response
  protected fetchUserData(addresses: string[]): Promise<any> {
    const contract = new DynamicContract(this.meta.vePTP);

    const calls = new Map();
    addresses.forEach((address) => {
      calls.set(`${address}-staked`, contract.createCall(this.functions.stakedAmount, address));
      calls.set(`${address}-pending`, contract.createCall(this.functions.pendingRewards, address));
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    // TODO: Rename to multicallResults / data?
    data: any,
  ): IStakingFeatureUserEntry {
    // TODO: A lot of code here seems to bee common, how to share it?
    const {
      output: { data: stakedRawAmount },
    } = data.get(`${address}-staked`);

    const stakedAmount = normalizeDecimals(stakedRawAmount, pool.supplied[0].token.decimals);

    if (!stakedAmount) {
      return;
    }

    Object.assign(pool.supplied[0], {
      amount: stakedAmount,
      value: stakedAmount * pool.supplied[0].token.price,
    });

    const {
      output: { data: pendingRawAmount },
    } = data.get(`${address}-pending`);

    const rewardAmount = normalizeDecimals(pendingRawAmount, pool.rewarded[0].token.decimals);

    Object.assign(pool.rewarded[0], {
      amount: rewardAmount,
      value: rewardAmount * pool.rewarded[0].token.price,
    });

    return pool as IStakingFeatureUserEntry;
  }
}
