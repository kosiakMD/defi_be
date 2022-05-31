import { equals } from 'class-validator';

import { DynamicContract } from '@app/common/web3provider/contracts/dynamic-contract';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { IMasterChefPoolInfo, MasterChef } from './master-chef';

export class MasterBelt extends MasterChef {
  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    // parse/format the supplied context data
    const poolIds = Array.from(Array(context.poolLength).keys());

    if (context.badPools && Array.isArray(context.badPools)) {
      // sort descending, and remove each from poolId queue
      context.badPools.sort((a, b) => (a > b ? -1 : 1)).forEach((id) => poolIds.splice(id, 1));
    }

    const poolInfos: (IMasterChefPoolInfo & { vaultTokenAddress: string })[] =
      await this.fetchPoolInfos(poolIds);

    const tokenPredicate: INamedFunctionPredicates = {
      totalStaked: () => (item) => equals(item.name, 'wantLockedTotal'),
    };
    const vaultFunctions = await this.abiService.parseFunctionsFromAddress(
      poolInfos[0].vaultTokenAddress,
      this.meta.chain,
      tokenPredicate,
    );

    const totalStakedCalls = poolInfos.map((poolInfo) => {
      return new DynamicContract(poolInfo.vaultTokenAddress).createCall(vaultFunctions.totalStaked);
    });

    const totalStakedPerPool = await this.multicall.callArray(totalStakedCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(), // totalStaked
        context,
      );
    });
  }

  protected formatPoolInfo(poolInfo: any[]) {
    // Get pool info outputs
    const poolInfoOutputs = this.functions.poolInfo.outputs;
    const lpTokenIdx = poolInfoOutputs.findIndex((output) => output.type === 'address');
    const allocPointIdx = poolInfoOutputs.findIndex((output) =>
      output.name.toLowerCase().startsWith('alloc'),
    );
    return poolInfo.map((pool) => ({
      poolId: pool.poolId,
      vaultTokenAddress: pool.strat.toString(),
      stakedToken: Object.values(pool)[lpTokenIdx].toString().toLowerCase(),
      allocPoint: parseInt(Object.values(pool)[allocPointIdx].toString(), 10),
    }));
  }

  protected getUserInfoAmountKey(): string {
    return 'shares';
  }
}
