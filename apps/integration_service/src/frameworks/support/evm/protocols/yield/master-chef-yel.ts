import { equals } from 'class-validator';
import { startsWith } from 'lodash';

import { regex } from '@app/common/utils';

import { INamedFunctionPredicates } from '../../../interfaces';
import { MasterChef } from './master-chef';

const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;

export class MasterChefYel extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    // first try to get an TOKEN per (block/second) item
    rewardPerSecond: () => (item) =>
      !startsWith(item.name, 'max') && !!regex(item.name, REWARD_REGEX)?.[0],
    // then use the above ABI item, to parse out the probable TOKEN name
    rewardToken:
      ({ context }) =>
      (item) =>
        equals(item.name, regex(context.rewardPerSecond?.name, REWARD_REGEX)?.[1]),
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalAlloc'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => equals(item.name, 'pendingYel'),
  };
}
