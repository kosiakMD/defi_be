import { CurrentPricesPayload } from '@app/common';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenOpportunity } from '../../../interfaces/tokens.supplied.interface';
import { updateStargateLpTokens } from '../Liquidity/StargateLiquidity';
import { MasterChef } from './MasterChef';

export class StargateStaking extends MasterChef {
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

    const totalLiquidityCalls = [];
    poolInfos.forEach((poolInfo) => {
      const lp = new ERC20(poolInfo.stakedToken);
      totalLiquidityCalls.push(lp.totalSupply());
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
    const amount = (supplied.token.underlying[0].balance = balance);
    const value = (supplied.token.underlying[0].value = balance * supplied.token.price);
    return Object.assign(supplied, {
      amount,
      value,
    });
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      return updateStargateLpTokens(
        tokens,
        prices,
        this.multicall,
        this.abiService,
        this.meta.chain,
      );
    } catch (err) {
      this.logger.error(err.message, err.stack, 'StargateStaking');
      return tokens;
    }
  }
}
