import { Injectable } from '@nestjs/common';
import { Web3Provider } from '../chain/web3.provider';
import { decimalsAmount, ETH_ADDRESS, ETH_DECIMALS, totalPrice } from '../util/util';

import {
  AccountTokenBalance,
  BalancesResponse,
  TokenBalance,
  TokenPrices,
  TokenRow,
} from './interfaces/balance.interfaces';
import { DbService } from './repository/db.service';

@Injectable()
export class BalanceService {
  constructor(
    private readonly dbService: DbService,
    private readonly chainProvider: Web3Provider,
  ) {}

  public async getAllBalanceData(accounts: string): Promise<BalancesResponse> {
    const allBalances: BalancesResponse = {};
    if (!accounts) {
      return allBalances;
    }

    const [ethBalances, bscBalances] = await Promise.all([
      this.getEthBalances(accounts),
      this.getBscBalances(accounts),
    ]);

    Object.keys(ethBalances).map((key) => {
      allBalances[key] = {
        account: key,
        totalUsd: ethBalances[key].totalUsd + bscBalances[key].totalUsd,
        tokens: [...ethBalances[key].tokens, ...bscBalances[key].tokens],
      };
    });

    return allBalances;
  }

  public async getEthBalances(accounts: string): Promise<BalancesResponse> {
    if (!accounts) {
      return {};
    }
    const accountsArray = accounts.split(',');
    const chainId = 1;

    const chainProvider: Web3 = this.chainProvider.instanceEth();

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, chainId);
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress);

    const [tokenPrices, ethBalances] = await Promise.all([
      this.dbService.getTokenPrices(tokensAddresses, chainId),
      Promise.all(
        accountsArray.map(async (account) => ({
          account,
          amount: await chainProvider.eth.getBalance(account),
        })),
      ),
    ]);

    const ethPrice = Object.prototype.hasOwnProperty.call(tokenPrices.prices, ETH_ADDRESS)
      ? tokenPrices.prices[`${ETH_ADDRESS}`]
      : 0;

    const etherBalances = ethBalances.map((balance) =>
      this.mapEthBalance({ ...balance, ethPrice }),
    );
    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices, chainId));

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
          account,
          totalUsd,
          tokens,
        },
      };
    }, {});
  }

  public async getBscBalances(accounts: string): Promise<BalancesResponse> {
    if (!accounts) {
      return {};
    }
    const accountsArray = accounts.split(',');
    const chainId = 2;

    const chainProvider: Web3 = this.chainProvider.instanceBsc();

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, chainId);
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress);

    const [tokenPrices, ethBalances] = await Promise.all([
      this.dbService.getTokenPrices(tokensAddresses, chainId),
      Promise.all(
        accountsArray.map(async (account) => ({
          account,
          amount: await chainProvider.eth.getBalance(account),
        })),
      ),
    ]);

    const bnbPrice = 0;

    const etherBalances = ethBalances.map((balance) =>
      this.mapBnbBalance({ ...balance, bnbPrice }),
    );
    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices, chainId));

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

  private mapBnbBalance = ({
    account,
    amount,
    bnbPrice,
  }: {
    account: string;
    amount: string;
    bnbPrice: number;
  }): AccountTokenBalance => {
    return {
      amount,
      account,
      decimalsAmount: decimalsAmount(amount, ETH_DECIMALS),
      tokenPriceUSD: bnbPrice,
      totalPriceUSD: totalPrice(amount, bnbPrice, ETH_DECIMALS),
      token: {
        chainId: 2,
        decimals: 18,
        symbol: 'BNB',
        name: 'BNB',
        address: ETH_ADDRESS,
      },
    };
  };

  private calculateTotalUsd = (tokens: TokenBalance[]): number =>
    tokens.reduce((total, { totalPriceUSD }) => total + (totalPriceUSD || 0), 0);

  private mapErc20Balance = (
    prices: TokenPrices,
    chainId: number,
  ): ((row: TokenRow) => AccountTokenBalance) => ({
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
      chainId: chainId,
      address: tokenAddress,
      name: tokenName || undefined,
      symbol: tokenSymbol || undefined,
      decimals: parseInt(tokenDecimals),
      totalSupply: +tokenTotalSupply || undefined,
    },
  });
}
