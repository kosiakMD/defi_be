import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Logger } from '@app/common';
import { ChainIdEnum } from '@app/common';

import { AceLabUser, MasterchefUser } from '../interfaces';
import { Claimable } from '../interfaces/claimable.interfaces';
import { acelabMap, farmsMap, farmAbis, acelabAbis, xBooMap, xBooAbis } from './util';

export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getPendingRewards(
    users: MasterchefUser[] | AceLabUser[],
    chain: ChainIdEnum,
    target: 'farm' | 'acelab',
  ): Promise<Claimable[]> {
    const pendingRewardCall = {
      farm: 'pendingBOO',
      acelab: 'pendingReward',
    };

    const targets = {
      farm: farmsMap.get(chain),
      acelab: acelabMap.get(chain),
    };

    const abis = {
      farm: farmAbis.get(chain),
      acelab: acelabAbis.get(chain),
    };

    const pools = users.flatMap((user) => {
      return user.balances.map((balance) => ({
        user: user.id,
        poolId: balance.poolId,
      }));
    });

    const inputs = pools.map((pool) => {
      const input: CallInput = {
        target: targets[target],
        function: pendingRewardCall[target],
        args: [pool.poolId, pool.user],
      };
      return input;
    });

    const [, claimable] = await this.multiCall(abis[target], inputs);

    return pools.map(
      (pool, idx): Claimable => ({
        user: pool.user,
        poolId: pool.poolId,
        claimable: claimable[idx].toString(),
      }),
    );
  }

  async getXBooForBoo(chainId: ChainIdEnum): Promise<number> {
    const input: CallInput[] = [
      {
        target: xBooMap.get(chainId),
        function: 'xBOOForBOO',
        args: ['1000000000000000000'], // 1e18 is 1 xBoo
      },
    ];

    const [, ratio] = await this.multiCall(xBooAbis.get(chainId), input);

    return new BigNumber(ratio.toString()) //
      .div(new BigNumber(10).pow(18))
      .toNumber();
  }
}
