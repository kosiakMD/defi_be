import { JsonFragment } from '@ethersproject/abi';
import { MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';

import { Abis } from '@app/common/jobs/ellipsis/ellipsis.abi';

export class EllipsisMulticall extends MultiCall {
  constructor(private readonly web3: Web3) {
    super(web3);
  }

  async getMinters(pools: string[]) {
    const inputs = pools.map((pool) => {
      return {
        target: pool,
        function: 'minter',
        args: [],
      };
    });

    const [, resp] = await this.multiCall([Abis.minter] as JsonFragment[], inputs);
    return pools.reduce((map, pool, index) => {
      return map.set(pool, resp[index]);
    }, new Map());
  }
}
