import { REWARD_REGEX } from 'apps/categorization_service/src/modules/protocols/services/abi/abi.string.utils';
import BigNumber from 'bignumber.js';

import { averageBlockTimeByChain } from '@app/common/constant/blocktime';
import { equals, regex, startsWith } from '@app/common/utils';

import { INamedFunctionPredicates } from '../../../interfaces';
import { MasterChef } from './MasterChef';

export class MasterChefNeureus extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    // first try to get an TOKEN per (block/second) item
    rewardPerSecond: () => (item) =>
      !startsWith(item.name, 'max') && !!regex(item.name, REWARD_REGEX)?.[0],
    // then use the above ABI item, to parse out the probable TOKEN name
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalAlloc'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => equals(item.name, 'claimableReward'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    context.rewardToken = '0xfcde4a87b8b6fa58326bb462882f1778158b02f1';
    context.totalAllocPoint = parseInt(context.totalAllocPoint, 10);

    // convert rewards per block to rewards per second to
    // standardize across chains
    const avgBlockTime = averageBlockTimeByChain[this.meta.chain] || 1;
    if (!averageBlockTimeByChain[this.meta.chain]) {
      this.logger.warn(
        `Missing Average BlockTIme for chain ${this.meta.chain}`,
        this.constructor.name,
      );
    }
    context.rewardPerSecond = new BigNumber(context.rewardPerSecond)
      .dividedBy(avgBlockTime)
      .toString();

    return context;
  }
}
