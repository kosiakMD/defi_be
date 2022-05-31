import { startsWith } from '@app/common/utils';

import { IMasterChefMeta, MasterChef } from './master-chef';

export interface IMasterChefCemetaryMeta extends IMasterChefMeta {
  context: {
    badPools?: number[];
    poolLength: number;
  };
}

/**
 * @notice nearly Standard Masterchef however no poolLength is available onchain
 */
export class MasterChefCemetary extends MasterChef {
  protected updateFunctionPredicates(): void {
    // tomb cemeteries don't include poolLength in the contract
    // hardcoded for now, but likely want to do screen scraping or
    // similar to fetch this value dynamically
    delete this.functionPredicates.poolLength;

    // after pool end time, rewardPerSecond drops to zero
    this.functionPredicates.poolEndTime = () => (item) => startsWith(item.name, 'poolEndTime');
  }

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
