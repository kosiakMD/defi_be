import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CurrentPricesPayload, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { MasterChef } from './MasterChef';

export class StargateStaking extends MasterChef {
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
    totalStaked: () => (item) => item.name === 'lpBalances',
    poolInfo: () => (item) => item.name === 'poolInfo',
    pendingRewards: () => (item) => item.name === 'pendingStargate',
    poolLength: () => (item) => item.name === 'poolLength',
    rewardPerSecond: () => (item) => item.name === 'stargatePerBlock',
    userInfo: () => (item) => item.name === 'userInfo',
    totalAllocPoint: () => (item) => item.name === 'totalAllocPoint',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());

    const poolInfos = await this.fetchPoolInfos(poolIds);

    const lpAbi = await this.abiService.fetchAbi(poolInfos[0].stakedToken, this.meta.chain);
    const totalLiquidityAbi = lpAbi.find((item) => item.name === 'totalLiquidity');

    const totalLiquidityCalls = [];
    poolInfos.forEach((poolInfo) => {
      const lpContract = new DynamicContract(poolInfo.stakedToken);
      totalLiquidityCalls.push(lpContract.createCall(totalLiquidityAbi));
    });

    const totalStakedPerPool = await this.multicall.callArray(totalLiquidityCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(),
        context,
      );
    });
  }

  protected modifyUserEntrySupplied(supplied: ISupplyTokenOpportunity, balance: number) {
    return Object.assign(supplied, {
      amount: balance,
      value: balance * supplied.token.underlying[0].price,
    });
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);
    const apy = this.formatSupplyApy?.(supplied);
    return {
      token,
      apy,
      tvl: totalSupplied * token.underlying[0].price,
    };
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      tokens.forEach((token) => {
        if (token.underlyingAssets?.length)
          prices[token.address] = prices[token.underlyingAssets[0].address];
      });
      return tokens;
    } catch (err) {
      this.logger.error(err.message, err.stack, 'StargateLiquidity');
      return tokens;
    }
  }
}
