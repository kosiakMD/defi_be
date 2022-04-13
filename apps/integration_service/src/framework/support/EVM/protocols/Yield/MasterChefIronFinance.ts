import { equals, regex, startsWith } from '@app/common/utils';

import { INamedFunctionPredicates } from '../../../interfaces';
import { MasterChef } from './MasterChef';

const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;

export class MasterChefIronFinance extends MasterChef {
  // Best Guess predicates to auto detect masterchef contract
  // Ideally in a base class such as MasterChef these will be as generic as possible and
  // attempt to get as many matches from various projects as possible
  // If a project can not be matched, this class can be extended and this can be overridden
  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    // first try to get an TOKEN per (block/second) item
    rewardPerSecond: () => (item) =>
      !startsWith(item.name, 'max') && !!regex(item.name, REWARD_REGEX)?.[0],
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalAlloc'),
    rewardToken: () => (item) => equals(item.name, 'rewardToken'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
  };
}
