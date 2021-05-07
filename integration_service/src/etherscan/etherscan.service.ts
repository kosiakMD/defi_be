import { Injectable } from '@nestjs/common';

import { CHAIN_ID_BSC } from '../pools/pools.setting';
import { EtherscanApi, EtherscanTransfer } from './etherscan.api';

@Injectable()
export class EtherscanService {
  constructor(private etherscanApi: EtherscanApi) {}

  async getBalances(addresses: string[]): Promise<any> {
    const transfersAll: Transfers = {};
    await Promise.all(
      addresses.map(async (a) => {
        return await this.etherscanApi.getTransfers(a);
      }),
    );
    const allBalances: BalancesResponse = {};
    Object.keys(transfersAll).forEach((address) => {
      if (allBalances[address] === undefined) {
        allBalances[address] = {
          totalUsd: 0,
          tokens: [],
        };
      }
      transfersAll[address].map((transfer) => {
        const amountToAdd: number = transfer.from === address ? -transfer.value : transfer.value;
        const decimalAmountToAdd: number = toDecimals(amountToAdd, transfer.tokenDecimal);
        const existedAccountBalance: AccountTokenBalance = allBalances[address].tokens.find(
          (tok) => tok.token.token.address === transfer.contractAddress,
        );
        if (existedAccountBalance === undefined) {
          const tokenBalance: AccountTokenBalance = {
            account: address,
            amount: amountToAdd.toString(),
            decimalsAmount: decimalAmountToAdd,
            token: {
              amount: amountToAdd,
              decimalsAmount: decimalAmountToAdd,
              tokenPriceUSD: 0,
              totalPriceUSD: 0,
              token: {
                chainId: CHAIN_ID_BSC,
                name: transfer.tokenName,
                address: transfer.contractAddress,
                decimals: transfer.tokenDecimal,
                symbol: transfer.tokenSymbol,
              },
            },
          };
          allBalances[address].tokens.push(tokenBalance);
        } else {
          existedAccountBalance.amount = (
            Number(existedAccountBalance.amount) + Number(amountToAdd)
          ).toString();
          existedAccountBalance.decimalsAmount =
            existedAccountBalance.decimalsAmount + decimalAmountToAdd;
          existedAccountBalance.token.amount =
            Number(existedAccountBalance.token.amount) + Number(amountToAdd);
          existedAccountBalance.token.decimalsAmount =
            existedAccountBalance.token.decimalsAmount + decimalAmountToAdd;
        }
      });
    });
    return allBalances;
  }
}

function toDecimals(amount: number, decimals: number) {
  return amount * Math.pow(10, -decimals);
}

export interface Transfers {
  [key: string]: EtherscanTransfer[];
}

export interface AccountBalance {
  totalUsd: number;
  tokens: AccountTokenBalance[];
}

export type BalancesResponse = { [key: string]: AccountBalance };

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: BalanceToken;
}

export interface BalanceToken {
  amount: number;
  decimalsAmount: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
  token: Token;
}

export interface Token {
  chainId: number;
  name: string;
  address: string;
  decimals: number;
  symbol: string;
}
