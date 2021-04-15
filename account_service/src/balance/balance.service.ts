import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { decimalsAmount, ETH_ADDRESS, ETH_DECIMALS, totalPrice } from '../util/util';
import {
  AccountTokenBalance,
  AllBalancesResponse,
  BalancesResponse,
  TokenBalance,
  TokenPrices,
  TokenRow,
} from './interfaces/balance.interfaces';
import { DbService } from './repository/db.service';

@Injectable()
export class BalanceService {
  constructor(private readonly dbService: DbService) {}

  public async getAllBalanceData(accounts: string): Promise<AllBalancesResponse> {
    const [bscBalance, balance] = await Promise.all([
      this.getUserBalances(accounts, 'bsc'),
      this.getUserBalances(accounts),
    ]);
    return { bscBalance, balance };
  }

  public async getUserBalances(accounts: string, bsc?: string): Promise<BalancesResponse> {
    const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_URL));

    const accountsArray = accounts.split(',');
    const chainId = bsc ? 2 : 1;

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, bsc);
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress);

    if (tokensAddresses.length === 0) {
      return;
    }

    const [tokenPrices, ethBalances] = await Promise.all([
      this.dbService.getTokenPrices(tokensAddresses, chainId),
      Promise.all(
        accountsArray.map(async (account) => ({
          account,
          amount: await web3.eth.getBalance(account),
        })),
      ),
    ]);

    const ethPrice = Object.prototype.hasOwnProperty.call(tokenPrices.prices, ETH_ADDRESS)
      ? tokenPrices.prices[`${ETH_ADDRESS}`]
      : 0;

    const etherBalances = ethBalances.map((balance) =>
      this.mapEthBalance({ ...balance, ethPrice }),
    );
    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices));

    return accountsArray.reduce((response, account) => {
      const ether = etherBalances.find((balance) => balance.account === account);
      const erc20 = erc20Balances.filter((balance) => balance.account === account);

      const tokens = [ether].concat(erc20).map((t) => {
        return {
          ...t,
          account: account,
        };
      });
      const totalUsd = this.calculateTotalUsd(tokens);

      return {
        ...response,
        [account]: {
          chainId,
          account,
          totalUsd,
          tokens,
        },
      };
    }, {});
  }

  private mapEthBalance = ({
    account,
    amount,
    ethPrice,
  }: {
    account: string;
    amount: string;
    ethPrice: number;
  }): AccountTokenBalance => {
    return {
      amount,
      account,
      decimalsAmount: decimalsAmount(amount, ETH_DECIMALS),
      tokenPriceUSD: ethPrice,
      totalPriceUSD: totalPrice(amount, ethPrice, ETH_DECIMALS),
      token: {
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
        address: ETH_ADDRESS,
      },
    };
  };

  private calculateTotalUsd = (tokens: TokenBalance[]): number =>
    tokens.reduce((total, { totalPriceUSD }) => total + (totalPriceUSD || 0), 0);

  private mapErc20Balance = (prices: TokenPrices): ((row: TokenRow) => AccountTokenBalance) => ({
    address,
    amount,
    tokenAddress,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenTotalSupply,
  }) => ({
    account: address,
    amount,
    decimalsAmount: decimalsAmount(amount, tokenDecimals),
    tokenPriceUSD: prices[tokenAddress] || undefined,
    totalPriceUSD: prices[tokenAddress]
      ? totalPrice(amount, prices[tokenAddress], tokenDecimals)
      : undefined,
    token: {
      address: tokenAddress,
      name: tokenName || undefined,
      symbol: tokenSymbol || undefined,
      decimals: parseInt(tokenDecimals),
      totalSupply: +tokenTotalSupply || undefined,
    },
  });
}
