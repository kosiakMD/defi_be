import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Web3Provider } from '../chain/web3.provider';
import { PriceService } from '../price/price.service';
import {
  abi,
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  decimalsAmount,
  ETH_BNB_ADDRESS,
  ETH_DECIMALS,
  getUniqueAndToLowerCaseArrayData,
  totalPrice,
  WETH_ADDRESS,
} from '../utils/utils';
import { CurrentPricesPayload } from './dto/price.response.dto';
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
  private readonly instanceChainProviderEth: Web3;
  private readonly instanceChainProviderBsc: Web3;

  constructor(
    private readonly dbService: DbService,
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
  ) {
    this.instanceChainProviderEth = this.chainProvider.instanceEth();
    this.instanceChainProviderBsc = this.chainProvider.instanceBsc();
  }

  private getPricesAndBalances(tokensAddresses, chainId, accountsArray): Promise<any[]> {
    return Promise.all([
      this.priceService.getTokenPrices(tokensAddresses, chainId),
      Promise.all(
        accountsArray.map(async (account) => ({
          account,
          amount: chainId === 1
            ? await this.instanceChainProviderEth.eth.getBalance(account)
            : await this.instanceChainProviderBsc.eth.getBalance(account)
        })),
      ),
    ]);
  }

  public async getAllBalanceData(accounts: string, chains: number): Promise<BalancesResponse> {
    const allBalances: BalancesResponse = {};
    if (!accounts) {
      return allBalances;
    }

    const [ethBalances, bscBalances] = await Promise.all([
      +chains !== CHAIN_ID_BSC ? this.getEthBalances(accounts) : null,
      +chains !== CHAIN_ID_ETH ? this.getBscBalances(accounts) : null,
    ]);

    if (ethBalances && bscBalances) {
      Object.keys(ethBalances).map((key) => {
        allBalances[key] = {
          totalUsd: ethBalances[key].totalUsd + bscBalances[key].totalUsd,
          tokens: [...ethBalances[key].tokens, ...bscBalances[key].tokens],
        };
      });

      return allBalances;
    }
    return ethBalances || bscBalances;
  }

  public async getEthBalances(accounts: string): Promise<BalancesResponse> {
    if (!accounts) {
      return {};
    }
    const accountsArray = getUniqueAndToLowerCaseArrayData(accounts.split(','));
    const chainId = CHAIN_ID_ETH;

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, chainId, WETH_ADDRESS);
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress.toLowerCase());

    const [tokenPrices, ethBalances] = await this.getPricesAndBalances(
      tokensAddresses,
      chainId,
      accountsArray,
    );

    const ethPrice = this.getUtilTokenPrice(ETH_BNB_ADDRESS, tokenPrices.prices);
    const wethPrice = this.getUtilTokenPrice(WETH_ADDRESS, tokenPrices.prices);

    const tokenInst = await new this.instanceChainProviderEth.eth.Contract(
      abi as AbiItem[],
      WETH_ADDRESS,
    );

    const etherBalances = [];
    for (const balance of ethBalances) {
      etherBalances.push(this.mapEthBalance({ ...balance, ethPrice }));
      const wethAmount = await tokenInst.methods.balanceOf(balance.account).call();
      if (+wethAmount !== 0) {
        etherBalances.push(
          this.mapEthBalance({
            account: balance.account,
            amount: wethAmount,
            ethPrice: undefined,
            wethPrice,
          }),
        );
      }
    }
    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices, chainId));

    return accountsArray.reduce((response, account) => {
      const accountFilter = (balance): boolean => balance.account === account;
      const ether = etherBalances.filter(accountFilter);
      const erc20 = erc20Balances.filter(accountFilter);

      const tokens = ether.concat(erc20).map((t) => {
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

    const accountsArray = getUniqueAndToLowerCaseArrayData(accounts.split(','));
    const chainId = CHAIN_ID_BSC;

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, chainId);
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress.toLowerCase());

    const [tokenPrices, ethBalances] = await this.getPricesAndBalances(
      tokensAddresses,
      chainId,
      accountsArray,
    );

    const bnbPrice = this.getUtilTokenPrice(ETH_BNB_ADDRESS, tokenPrices.prices);

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
    wethPrice,
  }: {
    account: string;
    amount: string;
    ethPrice?: number;
    wethPrice?: number;
  }): AccountTokenBalance => {
    const price = ethPrice === undefined ? wethPrice : ethPrice;
    return {
      amount,
      account,
      decimalsAmount: decimalsAmount(amount, ETH_DECIMALS),
      tokenPriceUSD: price,
      totalPriceUSD: totalPrice(amount, price, ETH_DECIMALS),
      token: {
        chainId: CHAIN_ID_ETH,
        decimals: 18,
        symbol: ethPrice === undefined ? 'WETH' : 'ETH',
        name: ethPrice === undefined ? 'Wrapped Ether' : 'Ether',
        address: ethPrice === undefined ? WETH_ADDRESS : ETH_BNB_ADDRESS,
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
        chainId: CHAIN_ID_BSC,
        decimals: 18,
        symbol: 'BNB',
        name: 'BNB',
        address: ETH_BNB_ADDRESS,
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
    decimalsAmount: decimalsAmount(amount, tokenDecimals ? tokenDecimals : 18),
    tokenPriceUSD: prices[tokenAddress] || 0,
    totalPriceUSD: prices[tokenAddress]
      ? totalPrice(amount, prices[tokenAddress], tokenDecimals ? tokenDecimals : 18)
      : 0,
    token: {
      chainId: chainId,
      address: tokenAddress,
      name: tokenName || null,
      symbol: tokenSymbol || null,
      decimals: tokenDecimals ? parseInt(tokenDecimals) : 18,
      totalSupply: +tokenTotalSupply || 0,
    },
  });

  private getUtilTokenPrice(token: string, prices: CurrentPricesPayload) {
    return Object.prototype.hasOwnProperty.call(prices, token.toLowerCase())
      ? prices[`${token.toLowerCase()}`] === null
        ? 0
        : prices[`${token.toLowerCase()}`]
      : 0;
  }
}
