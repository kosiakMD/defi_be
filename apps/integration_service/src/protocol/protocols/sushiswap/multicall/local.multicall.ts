import { CallInput, MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';

import { Address, Logger } from '@app/common';

import { SushiSwapMasterChefAbi } from '../abi/masterchef';

export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }
  async getPendingSushi(
    poolIds: string[],
    user: Address,
    masterChef: Address,
  ): Promise<Map<string, number>> {
    const inputs = poolIds.flatMap((poolId) => {
      const input: CallInput = {
        target: masterChef,
        function: 'pendingSushi',
        args: [poolId, user],
      };
      return input;
    });

    const [, pendingSushiRewards] = await this.multiCall(SushiSwapMasterChefAbi, inputs);

    return new Map<string, number>(
      pendingSushiRewards.map((pendingSushi, idx) => [poolIds[idx], parseInt(pendingSushi, 10)]),
    );
  }
}
