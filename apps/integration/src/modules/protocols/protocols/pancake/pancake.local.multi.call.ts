// to be removed once transition to v2 will be completed
import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Logger } from '@app/common';

import { MASTER_CHEF_PANCAKE_ABI } from './contracts/masterchef.pancake';
import { RewardsData } from './pancake.interfaces';

// todo: remove this class
export class PancakeLocalMultiCall extends MultiCall {
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
}
