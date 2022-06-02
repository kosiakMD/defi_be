import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import {
  AccountBalance,
  AccountTokenBalance,
  BalancesResponse,
  EtherscanTransfer,
} from './pancake.interfaces';
import { ScanApi } from './scan.api';

function toDecimals(amount: number, decimals: number): number {
  return amount * Math.pow(10, -decimals);
}

@Injectable()
export class EtherscanService {
  constructor(private etherscanApi: ScanApi) {}

  async getBalances(addresses: Address[]): Promise<BalancesResponse> {
    const transfersAll = new Map<Address, EtherscanTransfer[]>();
    await Promise.all(
      addresses.map((address) => {
        return this.etherscanApi.getTransfers(address).then((transfers) => {
          transfersAll.set(address, transfers);
          Promise.resolve();
        });
      }),
    );
    const allBalances: BalancesResponse = new Map<Address, AccountBalance>();
    transfersAll.forEach((transfers, address) => {
      let balance = allBalances.get(address);
      if (!balance) {
        balance = {
          account: '',
          totalUsd: 0,
          tokens: new Map(),
        };
        allBalances.set(address, balance);
      }
      transfers.forEach((transfer) => {
        const amountToAdd: number = transfer.from === address ? -transfer.value : transfer.value;
        const decimalAmountToAdd: number = toDecimals(amountToAdd, transfer.tokenDecimal);
        const existedAccountBalance: AccountTokenBalance = balance.tokens.get(
          transfer.contractAddress,
        );
        if (!existedAccountBalance) {
          const tokenBalance: AccountTokenBalance = {
            account: address,
            amount: amountToAdd.toString(),
            decimalsAmount: decimalAmountToAdd,
            token: {
              amount: String(amountToAdd),
              decimalsAmount: decimalAmountToAdd,
              tokenPriceUSD: 0,
              totalPriceUSD: 0,
              token: {
                chainId: ChainIdEnum.bnb,
                name: transfer.tokenName,
                address: transfer.contractAddress,
                decimals: transfer.tokenDecimal,
                symbol: transfer.tokenSymbol,
              },
            },
          };
          balance.tokens.set(transfer.contractAddress, tokenBalance);
        } else {
          existedAccountBalance.amount = (
            Number(existedAccountBalance.amount) + amountToAdd
          ).toString();
          existedAccountBalance.decimalsAmount =
            existedAccountBalance.decimalsAmount + decimalAmountToAdd;
          existedAccountBalance.token.amount = String(
            +existedAccountBalance.token.amount + amountToAdd,
          );
          existedAccountBalance.token.decimalsAmount =
            existedAccountBalance.token.decimalsAmount + decimalAmountToAdd;
        }
      });
    });
    return allBalances;
  }
}
