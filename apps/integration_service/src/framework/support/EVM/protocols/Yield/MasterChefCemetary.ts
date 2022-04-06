import { equals, regex, startsWith } from '@app/common/utils';

import { INamedFunctionPredicates } from '../../../interfaces';
import { MasterChef } from './MasterChef';

// Opted to localize this regex here instead of in a constants file,
// as it will make it easier to extend/override as needed. Currently it
// is the same as MasterChef and others, however, if an adjustment is needed
// it will only need to be made on a specific category, not globally
const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;

/**
 * @notice nearly Standard Masterchef however no poolLength is available onchain
 */
export class MasterChefCemetary extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    // poolLength: missing on tomb cemetary/farms (must be provided in meta)
    rewardPerSecond: () => (item) =>
      !startsWith(item.name, 'max') && !!regex(item.name, REWARD_REGEX)?.[0],
    rewardToken:
      ({ context }) =>
      (item) =>
        equals(item.name, regex(context.rewardPerSecond?.name, REWARD_REGEX)?.[1]),
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalalloc'),
    poolInfo: () => (item) => startsWith(item.name, 'poolinf'),
    userInfo: () => (item) => startsWith(item.name, 'userinf'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
    poolEndTime: () => (item) => startsWith(item.name, 'poolEndTime'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.rewardToken = context.rewardToken.toLowerCase();
    context.totalAllocPoint = parseInt(context.totalAllocPoint, 10);
    context.poolEndTime = new Date(context.poolEndTime.toNumber() * 1000);
    // Set APR to zero if emissions are over
    context.rewardPerSecond =
      context.poolEndTime > new Date() ? context.rewardPerSecond.toString() : '0';
    return context;
  }
}
