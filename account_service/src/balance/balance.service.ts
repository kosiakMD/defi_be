import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { Web3Provider } from '../chain/web3.provider';
import { MulticallSevice } from '../multicall/multicall.sevice';
import { PriceService } from '../price/price.service';
import {
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  decimalsAmount,
  ETH_BNB_ADDRESS,
  getUniqueAndToLowerCaseArrayData,
  totalPrice,
  WETH_ADDRESS,
} from '../utils/utils';
import { getUtilTokenPrice, mapTokenBalances } from './balance_util/balance.util';
import {
  AccountTokenBalance,
  BalancesResponse,
  BalanceToken,
  DbTokenPrice,
  TokenBalance,
  TokenPrices,
  TokenRow,
  Web3TokenBalance,
} from './interfaces/balance.interfaces';
import { DbService } from './repository/db.service';
import { NO_DB_BNB_TOKENS, NO_DB_ETH_TOKENS } from './tokens/tokens';

@Injectable()
export class BalanceService {
  private readonly instanceChainProviderEth: Web3;
  private readonly instanceChainProviderBsc: Web3;
  private readonly noDbTokensEth: string[];
  private readonly noDbTokensBsc: string[];

  constructor(
    private readonly dbService: DbService,
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
    private readonly multicallSevice: MulticallSevice,
  ) {
    this.instanceChainProviderEth = this.chainProvider.instanceEth();
    this.instanceChainProviderBsc = this.chainProvider.instanceBsc();
    this.noDbTokensEth = NO_DB_ETH_TOKENS.map((token) => token.address);
    this.noDbTokensBsc = NO_DB_BNB_TOKENS.map((token) => token.address);
  }

  private getPricesAndBalances(tokensAddresses, chainId, accountsArray): Promise<any[]> {
    return Promise.all([
      this.priceService.getTokenPrices(tokensAddresses, Number(chainId), 1),
      Promise.all(
        accountsArray.map(async (account) => ({
          account,
          amount:
            chainId === 1
              ? await this.instanceChainProviderEth.eth.getBalance(account)
              : await this.instanceChainProviderBsc.eth.getBalance(account),
        })),
      ),
    ]);
  }

  private async getArrayOfTokenBalances(
    ethBalances: Web3TokenBalance[],
    priceArray: DbTokenPrice[],
    balanceArray: BalanceToken[],
    chain: number,
    mapNoDbTokenBalances?: Map<string, TokenPrices[]>,
  ) {
    const etherBalances = [];
    for (const balance of ethBalances) {
      const noDbTokenBalances = mapNoDbTokenBalances
        ? mapNoDbTokenBalances.get(balance.account)
        : [];
      for (let i = 0; i < balanceArray.length; i++) {
        const price = priceArray.find((item) => item.address === balanceArray[i].address);
        if (balanceArray[i].address === ETH_BNB_ADDRESS) {
          const temporary = mapTokenBalances({
            ...balance,
            token: balanceArray[i],
            chainId: chain,
            price: price.price,
          });
          etherBalances.push(temporary);
          continue;
        }

        const amountObj = noDbTokenBalances.find((b) => b[balanceArray[i].address]);
        if (amountObj && +amountObj[balanceArray[i].address] !== 0) {
          etherBalances.push(
            mapTokenBalances({
              account: balance.account,
              amount: amountObj[balanceArray[i].address].toString(),
              token: balanceArray[i],
              chainId: chain,
              price: price.price,
            }),
          );
        }
      }
    }
    return etherBalances;
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

    const tokenRows = await this.dbService.loadErc20Balances(
      accountsArray,
      CHAIN_ID_ETH,
      WETH_ADDRESS,
    );
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress.toLowerCase());

    const [tokenPrices, ethBalances] = await this.getPricesAndBalances(
      tokensAddresses,
      CHAIN_ID_ETH,
      accountsArray,
    );

    const priceArray = getUtilTokenPrice(NO_DB_ETH_TOKENS, tokenPrices.prices);

    const multicallBalances = await this.multicallSevice.multicall(
      this.noDbTokensEth,
      accountsArray,
      this.instanceChainProviderEth,
    );

    const etherTokenBalances = await this.getArrayOfTokenBalances(
      ethBalances,
      priceArray,
      NO_DB_ETH_TOKENS,
      CHAIN_ID_ETH,
      multicallBalances,
    );

    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices, CHAIN_ID_ETH));

    return accountsArray.reduce((response, account) => {
      const accountFilter = (balance): boolean => balance.account === account;
      const ether = etherTokenBalances.filter(accountFilter);
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

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, CHAIN_ID_BSC);
    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress.toLowerCase());

    const [tokenPrices, bscBalances] = await this.getPricesAndBalances(
      tokensAddresses,
      CHAIN_ID_BSC,
      accountsArray,
    );

    const priceArray = await getUtilTokenPrice(NO_DB_BNB_TOKENS, tokenPrices.prices);

    const multicallBalances = await this.multicallSevice.multicall(
      this.noDbTokensBsc,
      accountsArray,
      this.instanceChainProviderBsc,
    );

    const bscTokenBalances = await this.getArrayOfTokenBalances(
      bscBalances,
      priceArray,
      NO_DB_BNB_TOKENS,
      CHAIN_ID_BSC,
      multicallBalances,
    );

    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices, CHAIN_ID_BSC));

    return accountsArray.reduce((response, account) => {
      const bsc = bscTokenBalances.filter((balance) => balance.account === account);
      const erc20 = erc20Balances.filter((balance) => balance.account === account);

      const tokens = bsc.concat(erc20).map((t) => {
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
}
