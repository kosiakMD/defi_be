import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
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
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

interface ICakeVaultContext {
  masterchef: Address;
  poolId: number;
  totalStaked: string;
  stakedToken: Address;
  rewardToken: Address;
  pricePerShare: string;
}

export interface ICakeVaultMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: ICakeVaultContext;
  address: Address;
}

export class CakeVault
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    ICakeVaultMeta
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
  protected functionPredicates: INamedFunctionPredicates = {
    totalStaked: () => (item) => item.name === 'balanceOf', // not an erc20, this reports the contracts amount on pool 0 of masterchef
    stakedToken: () => (item) => item.name === 'token',
    rewardToken: () => (item) => item.name === 'token', // compounding
    pricePerShare: () => (item) => item.name === 'getPricePerFullShare',
    masterchef: () => (item) => item.name === 'masterchef',
    userInfo: () => (item) => item.name === 'userInfo',
  };

  protected formatContext(context: { [key: string]: any }): ICakeVaultContext {
    context.totalStaked = context.totalStaked.toString();
    context.stakedToken = context.stakedToken.toLowerCase();
    context.rewardToken = context.rewardToken.toLowerCase();
    context.pricePerShare = context.pricePerShare.toString();
    context.masterchef = context.masterchef.toLowerCase();
    return context as ICakeVaultContext;
  }

  protected async fetchOpportunityData(
    context: ICakeVaultContext,
  ): Promise<IStakingFeatureMinimal[]> {
    // fetch masterchef abi

    const rewardPerSecond = await this.fetchRewardPerSecond(context);
    // get totalAllocPoints
    // get pool 0 allocPoint
    // get pool 0 rewardsPerSecond
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: context.stakedToken },
            totalSupplied: context.totalStaked,
          },
        ],
        rewarded: [
          {
            token: { address: context.rewardToken },
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
    const stakedToken = tokens.get(pool.supplied[0].token.address);
    const rewardedToken = tokens.get(pool.rewarded[0].token.address);
    if (!stakedToken || !rewardedToken) return;
    const totalSupplied = normalizeDecimals(pool.supplied[0].totalSupplied, stakedToken.decimals);
    const tvl = totalSupplied * stakedToken.price;

    const tokensPerSecond = normalizeDecimals(
      pool.rewarded[0].rewardPerSecond,
      rewardedToken.decimals,
    );
    const pricePerSecond = tokensPerSecond * rewardedToken.price;

    // yield is a reserved word 🙄
    const { apr: harvests } = this.getYieldBreakdown(tokensPerSecond, 1);
    const { apr, apy } = this.getYieldBreakdown(pricePerSecond, tvl);

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      supplied: [
        {
          token: stakedToken,
          totalSupplied,
          tvl,
        },
      ],
      rewarded: [
        {
          token: rewardedToken,
          harvests,
          apr,
          apy, // assuming once per day
        },
      ],
    };
  }

  protected fetchUserData(addresses: Address[], pools: IStakingFeatureOpportunity[]) {
    const contract = this.getMainContract();

    const calls = new Map();
    addresses.forEach((address) => {
      return pools.forEach((pool) => {
        calls.set(
          `${pool.id}.balanceOf(${address})`,
          contract.createCall(this.functions.userInfo, address),
        );

        calls.set(
          this.functions.pricePerShare.name,
          contract.createCall(this.functions.pricePerShare),
        );
      });
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }
  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const {
      output: { data: userInfo },
    } = data.get(`${pool.id}.balanceOf(${address})`);

    const pricePerShare = data.get(this.functions.pricePerShare.name);

    const balance = normalizeDecimals(
      userInfo.shares.times(pricePerShare),
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;

    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });

    // Auto Compounding, will assume 0 here
    Object.assign(pool.rewarded[0], { amount: 0, value: 0 });

    return pool as IStakingFeatureUserEntry;
  }

  protected async fetchRewardPerSecond(context: {
    masterchef: Address;
    poolId: number;
  }): Promise<string> {
    const masterChefAbi = await this.abiService.fetchAbi(context.masterchef, this.meta.chain);
    const contract = new DynamicContract(context.masterchef);

    const [poolInfo, totalAllocPoint, rewardPerBlock] = await this.multicall.callArray(
      [
        contract.createCall(
          masterChefAbi.find((item) => item.name === 'poolInfo'),
          context.poolId,
        ),
        contract.createCall(masterChefAbi.find((item) => item.name === 'totalAllocPoint')),
        contract.createCall(masterChefAbi.find((item) => item.name === 'cakePerBlock')),
      ],
      this.meta.chain,
    );

    return poolInfo.allocPoint //
      .div(totalAllocPoint)
      .times(rewardPerBlock.div(3)) // CakeVault is rewardsPerBlock and average block time on BSC is 3 seconds
      .toString();
  }
}
