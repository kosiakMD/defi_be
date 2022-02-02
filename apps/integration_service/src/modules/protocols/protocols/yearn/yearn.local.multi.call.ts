import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Logger } from '@app/common';
import { chunk } from '@app/common/utils';

import { YearnVaultCommonAbi } from './contracts/YearnVaultCommonAbi';
import { IYearnUser } from './yearn.interfaces';

export class YearnLocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async injectPositionBalances(users: IYearnUser[]): Promise<void> {
    const balanceInputsByUser = users.map((user) => {
      return user.positions.flatMap((position) => {
        const input: CallInput[] = [
          {
            target: position.vault.address,
            function: 'balanceOf',
            args: [user.id],
          },
          {
            target: position.vault.address,
            function: 'pricePerShare',
          },
        ];
        return input;
      });
    });

    const balancesByUser = await Promise.all(
      balanceInputsByUser.map(async (inputs) => {
        const results = [];
        for (const chunkedInputs of chunk(inputs, 8)) {
          const data = await this.multiCall(YearnVaultCommonAbi, chunkedInputs);
          const [, balances] = data;
          results.push(...balances);
        }
        return results;
      }),
    );

    users.forEach((user, idx) => {
      const vaultUserInfo = balancesByUser[idx];

      const normalizedBalances = this.normalizeTokenToSharePrice(vaultUserInfo, user);

      user.positions.forEach((position, jdx) => {
        position.balance = Number(
          new BigNumber(normalizedBalances[jdx])
            .multipliedBy(new BigNumber(10).pow(position.token.decimals))
            .toString(),
        );
      });
    });
  }

  normalizeTokenToSharePrice(vaultUserInfo: string[], user: IYearnUser): number[] {
    return vaultUserInfo.reduce((acc, cur, idx, startingArray) => {
      // skip the price per share (every second item)
      if (idx % 2) return acc;

      const decimals = user.positions[Math.ceil(idx / 2)].token.decimals;

      const balance = Number(
        new BigNumber(parseInt(startingArray[idx], 10))
          .dividedBy(new BigNumber(10).pow(decimals))
          .toString(),
      );
      const pricePerShare = Number(
        new BigNumber(parseInt(startingArray[idx + 1], 10))
          .dividedBy(new BigNumber(10).pow(decimals))
          .toString(),
      );
      acc.push(balance * pricePerShare);
      return acc;
    }, []);
  }
}
