import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '../common/enum';

import { AccountTokenBalance, BalancesResponse, Transfers } from './interfaces';
import { ScanApi } from './scan-api.service';

function toDecimals(amount: number, decimals: number): number {
  return amount * Math.pow(10, -decimals);
}

@Injectable()
export class EtherscanService {
  constructor(private etherscanApi: ScanApi) {}

  async getBalances(addresses: string[]): Promise<any> {
    const transfersAll: Transfers = {};
    await Promise.all(
      addresses.map(async (a) => {
        transfersAll[a] = await this.etherscanApi.getTransfers(a);
      }),
    );
    const allBalances: BalancesResponse = {};
    Object.keys(transfersAll).forEach((address) => {
      if (allBalances[address] === undefined) {
        allBalances[address] = {
          account: '',
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
                chainId: ChainIdEnum.bsc,
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
