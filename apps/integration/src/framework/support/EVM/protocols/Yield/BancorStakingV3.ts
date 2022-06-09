// eslint-disable-next-line max-classes-per-file
import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { dataFrom, first, normalizeDecimals, second, toBN } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { MissingTokenException } from '../../../exceptions';
import {
  INamedFunctionPredicates,
  INamedFunctions,
  IProtocolMeta,
  TokenMap,
} from '../../../interfaces';
import { IStakingFeatureUserEntry } from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
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

export interface IBancorStakingMeta extends IProtocolMeta {
  address: Address;
  vault: Address;
  info: Address;
}

const NULL_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

type ISupplyExtra = {
  isActive: boolean;
  balance: string;
  poolTokenRate: string;
};

type IBancorSupplyTokenMinimal = ISupplyTokenMinimal<ISupplyExtra>;
type IStakingFeatureMinimal = BaseWithTokens<
  IBancorSupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  any
>;
type ISupplyBancorTokenOpportunity = ISupplyTokenOpportunity<ISupplyExtra>;
type IStakingFeatureOpportunity = BaseWithTokens<
  ISupplyBancorTokenOpportunity[],
  IRewardTokenOpportunity[],
  void,
  any
>;

export class BancorStakingV3 extends SingleContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  IBancorStakingMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected assetService: FakeAssetService,
    protected priceService: PriceService,
  ) {
    super();
  }

  infoFunctions: INamedFunctions = {};

  protected functionPredicates: INamedFunctionPredicates = {
    programIds: () => (item) => item.name === 'programIds',
    programs: () => (item) => item.name === 'programs',
    isProgramActive: () => (item) => item.name === 'isProgramActive',
    pendingRewards: () => (item) => item.name === 'pendingRewards',
    providerStake: () => (item) => item.name === 'providerStake',
  };

  protected infoFunctionPredicates: INamedFunctionPredicates = {
    poolTokenRate: () => (item) => item.name === 'poolTokenToUnderlying',
  };

  async initialize() {
    await super.initialize();
    this.infoFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.info,
      this.meta.chain,
      this.infoFunctionPredicates,
    );
  }

  async fetchOpportunityData(context): Promise<IStakingFeatureMinimal[]> {
    const programIds = context.programIds.map((id) => id.toNumber());
    const configurations: Map<string, ProgramConfiguration> =
      await this.fetchProgramsConfigurations(programIds);
    const balances = await this.fetchProgramBalances(
      programIds.map((id) => {
        return {
          id: id.toString(),
          token: configurations.get(id.toString()).pool,
          bnToken: configurations.get(id.toString()).poolToken,
        };
      }),
    );
    return programIds.map((programId) => {
      const programBalances = balances.get(programId.toString());
      const programConf = configurations.get(programId.toString());
      return {
        id: `${this.meta.address}::${programConf.id}`,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: programConf.poolToken,
            },
            extra: {
              balance: programBalances.tokenBalance,
              poolTokenRate: programBalances.poolTokenRate.toString(),
              isActive: programBalances.isActive,
            },
          },
        ],
        rewarded: [
          {
            token: { address: programConf.rewardsToken },
            rewardPerSecond: programConf.rewardRate,
          },
        ],
        meta: {
          configuration: {
            programConf,
          },
        },
      };
    });
  }

  async fetchProgramsConfigurations(poolIds: number[]) {
    let calls = new Map<string, CallData>(
      poolIds.map((id) => {
        return [
          Labels.programs(this.meta.address, id),
          plainToClass(CallData, {
            address: this.meta.address,
            abi: this.functions.programs,
            input: {
              data: [[id]],
            },
          }),
        ];
      }),
    );
    calls = await this.multicall.handleInBatches(calls, this.meta.chain);
    return new Map<string, ProgramConfiguration>(
      poolIds.map((id) => {
        const data = calls.get(Labels.programs(this.meta.address, id)).output.data.shift();
        return [
          id.toString(),
          {
            id: data.id,
            pool: data.pool.toLowerCase(),
            poolToken: data.poolToken.toLowerCase(),
            rewardsToken: data.rewardsToken.toLowerCase(),
            isEnabled: data.isEnabled,
            startTime: Number(data.startTime),
            endTime: Number(data.endTime),
            rewardRate: data.rewardRate,
            remainingRewards: data.remainingRewards,
          },
        ];
      }),
    );
  }

  private async fetchProgramBalances(pools: { id: string; token: string; bnToken: string }[]) {
    let calls = new Map<string, CallData>();
    // is pool active
    pools.forEach((pool) => {
      calls.set(
        Labels.isProgramActive(this.meta.address, Number(pool.id)),
        plainToClass(CallData, {
          address: this.meta.address,
          abi: this.functions.isProgramActive,
          input: {
            data: [pool.id],
          },
        }),
      );
      calls.set(
        Labels.poolTokenRate(this.meta.info, pool.token, Number(pool.id)),
        plainToClass(CallData, {
          address: this.meta.info,
          abi: this.infoFunctions.poolTokenRate,
          input: {
            data: [pool.token, Math.pow(10, 18).toString()],
          },
        }),
      );
    });
    // underlying token balances on vault contract
    pools.forEach((pool) => {
      if (pool.token !== NULL_ADDRESS) {
        calls.set(
          Labels.balanceOf(pool.token, this.meta.vault),
          plainToClass(CallData, {
            address: pool.token,
            abi: ERC20.balanceOf,
            input: {
              data: [this.meta.vault],
            },
          }),
        );
      }
    });
    calls = await this.multicall.handleInBatches(calls, this.meta.chain);
    const vaultCoinBalance = await this.multicall
      .web3(this.meta.chain)
      .eth.getBalance(this.meta.vault);
    return new Map<string, { isActive: boolean; tokenBalance: string; poolTokenRate: number }>(
      pools.map((pool) => {
        const isActive = dataFrom(
          calls,
          Labels.isProgramActive(this.meta.address, Number(pool.id)),
        );
        const tokenRate = dataFrom(
          calls,
          Labels.poolTokenRate(this.meta.info, pool.token, Number(pool.id)),
        ).shiftedBy(-18);
        const tokenBalance =
          pool.token === NULL_ADDRESS
            ? vaultCoinBalance
            : dataFrom(calls, Labels.balanceOf(pool.token, this.meta.vault));
        return [
          pool.id,
          {
            isActive: isActive,
            tokenBalance: tokenBalance.toString(),
            poolTokenRate: tokenRate,
          },
        ];
      }),
    );
  }

  protected formatOpportunity(
    opportunity: IStakingFeatureMinimal,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunity {
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      meta: opportunity.meta,
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

      return this.formatOpportunityRewardedToken(poolToken, token, base.supplied[0].tvl);
    });
    return base;
  }

  protected formatOpportunitySuppliedToken(
    supplied: IBancorSupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyBancorTokenOpportunity {
    const underlyingToken = first(token.underlying);
    const price = underlyingToken.price / Number(supplied.extra.poolTokenRate);
    const balance = normalizeDecimals(toBN(supplied.extra.balance), token.decimals);
    return {
      token: {
        ...token,
        price: price,
      },
      tvl: balance * price,
      extra: supplied.extra,
    };
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    let calls = new Map<string, CallData>();
    pools.forEach((pool) => {
      const programId = second(pool.id.split('::'));
      calls.set(
        Labels.providerStake(this.meta.address, address, Number(programId)),
        plainToClass(CallData, {
          address: this.meta.address,
          abi: this.functions.providerStake,
          input: {
            data: [address, Number(programId)],
          },
        }),
      );
      calls.set(
        Labels.providerRewards(this.meta.address, address, Number(programId)),
        plainToClass(CallData, {
          address: this.meta.address,
          abi: this.functions.pendingRewards,
          input: {
            data: [address, [Number(programId)]],
          },
        }),
      );
    });

    calls = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, calls);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const programId = second(pool.id.split('::'));
    let balance = dataFrom(
      data,
      Labels.providerStake(this.meta.address, address, Number(programId)),
    );
    let rewardBalance = dataFrom(
      data,
      Labels.providerRewards(this.meta.address, address, Number(programId)),
    );

    if (balance.isZero()) {
      return;
    }

    const userPool = cloneDeep(pool);
    // don't need meta in user's response
    delete userPool.meta;
    let supplied = userPool.supplied.shift();
    const underlying = supplied.token.underlying.shift();
    // balance of lp token from staking contract
    balance = normalizeDecimals(balance, supplied.token.decimals);
    supplied = Object.assign(supplied, {
      amount: balance,
      value: balance * supplied.token.price,
    });
    supplied.token.underlying = [
      Object.assign(underlying, {
        amount: balance * Number(supplied.extra.poolTokenRate),
        value: balance * underlying.price,
      }),
    ];

    let rewarded = userPool.rewarded.shift();
    rewardBalance = normalizeDecimals(rewardBalance, rewarded.token.decimals);
    rewarded = Object.assign(rewarded, {
      amount: rewardBalance,
      value: rewardBalance * rewarded.token.price,
    });
    userPool.supplied = [supplied];
    userPool.rewarded = [rewarded];
    return userPool as IStakingFeatureUserEntry;
  }
}

class Labels {
  static programs(address: string, programId: number) {
    return `${address}_programs(${programId})`;
  }
  static isProgramActive(address: string, programId: number) {
    return `${address}_isProgramActive(${programId})`;
  }
  static balanceOf(tokenAddress: string, accountAddress: string) {
    return `${tokenAddress}_balanceOf(${accountAddress})`;
  }
  static totalSupply(tokenAddress: string) {
    return `${tokenAddress}_totalSupply()`;
  }
  static providerStake(contractAddress: string, provider: string, programId: number) {
    return `${contractAddress}_providerStake(${provider}, ${programId})`;
  }
  static providerRewards(contractAddress: string, provider: string, programId: number) {
    return `${contractAddress}_providerRewards(${provider}, ${programId})`;
  }
  static poolTokenRate(contractAddress: string, token: string, programId: number) {
    return `${contractAddress}_poolTokenRate(${token}, ${programId})`;
  }
}

interface ProgramConfiguration {
  id: number;
  pool: string;
  poolToken: string;
  rewardsToken: string;
  isEnabled: boolean;
  startTime: number;
  endTime: number;
  rewardRate: string;
  remainingRewards: string;
}
