import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Logger } from '@app/common';

import { MASTER_CHEF_PANCAKE_ABI } from './abis/masterchef.pancake';
import { MASTER_CHEF_TRADERJOEV2_ABI } from './abis/masterchef.traderjoeV2';
import { MASTER_CHEF_TRADERJOEV3_ABI } from './abis/masterchef.traderjoeV3';
import { RewardsData } from './dto/pancake.interfaces';
import { RewardsData as RewardsDataTraderJoe } from './dto/traderjoe.interfaces';

// todo: remove this class
export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getPendingCake(
    rewardsData: RewardsData[],
    masterchiefAddress: string,
  ): Promise<RewardsData[]> {
    const inputs = rewardsData.map((d) => {
      const input: CallInput = {
        target: masterchiefAddress,
        function: 'pendingCake',
        args: [d.poolId, d.userAddress],
      };
      return input;
    });

    const [, rewardsChainData] = await this.multiCall(MASTER_CHEF_PANCAKE_ABI, inputs);
    for (let i = 0; i < rewardsData.length; i++) {
      rewardsData[i].pendingCake = new BigNumber(rewardsChainData[i].toString());
    }

    return rewardsData;
  }

  // todo: remove
  async getPendingJoe(
    rewardsData: RewardsDataTraderJoe[],
    masterchiefAddress: string,
  ): Promise<RewardsDataTraderJoe[]> {
    const inputs = rewardsData.map((d) => {
      const input: CallInput = {
        target: masterchiefAddress,
        function: 'pendingTokens',
        args: [d.poolId, d.userAddress],
      };
      return input;
    });

    const [, rewardsChainData] = await this.multiCall(MASTER_CHEF_TRADERJOEV2_ABI, inputs);

    for (let i = 0; i < rewardsData.length; i++) {
      rewardsData[i].pendingJoe = new BigNumber(rewardsChainData[i].pendingJoe.toString());
    }

    return rewardsData;
  }

  // todo: remove
  async getPendingJoeV3(
    rewardsData: RewardsDataTraderJoe[],
    masterchiefAddress: string,
  ): Promise<RewardsDataTraderJoe[]> {
    const inputs = rewardsData.map((d) => {
      const input: CallInput = {
        target: masterchiefAddress,
        function: 'pendingTokens',
        args: [d.poolId, d.userAddress],
      };
      return input;
    });

    const [, rewardsChainData] = await this.multiCall(MASTER_CHEF_TRADERJOEV3_ABI, inputs);

    for (let i = 0; i < rewardsData.length; i++) {
      rewardsData[i].pendingJoe = new BigNumber(rewardsChainData[i].pendingJoe.toString());
      rewardsData[i].pendingBonusToken = new BigNumber(
        rewardsChainData[i].pendingBonusToken.toString(),
      );
      rewardsData[i].bonusTokenAddress = rewardsChainData[i].bonusTokenAddress;
    }

    return rewardsData;
  }
}
