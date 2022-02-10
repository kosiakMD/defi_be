import { MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { Contract, Provider } from 'ethers-multicall';
import Web3 from 'web3';

import { Logger } from '@app/common';

import { IYearnUser } from './yearn.interfaces';

export class YearnLocalMultiCall extends MultiCall {
  rpc: string = null;
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    // Save the URL of the current RPC in use by web3
    this.rpc = (web3.currentProvider as any).host;
    this.logger = logger;
  }

  async injectPositionBalances(users: IYearnUser[]): Promise<void> {
    // TODO: this would be in the web3Provider
    const provider = new ethers.providers.StaticJsonRpcProvider(this.rpc);
    const ethcallProvider = new Provider(provider);
    await ethcallProvider.init();

    const balanceInputsByUser = users.map((user) =>
      user.positions.flatMap((position) => {
        // TODO: I just inlined the ABI here, but we would fetch the abi, or save a file locally, etc
        const vault = new Contract(position.vault.address, [
          'function balanceOf(address) view returns (uint256)',
          'function pricePerShare() view returns (uint256)',
        ]);
        return [vault.balanceOf(user.id), vault.pricePerShare()];
      }),
    );

    const balancesByUser = await Promise.all(
      balanceInputsByUser.map(async (userCalls) => ethcallProvider.all(userCalls)),
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
