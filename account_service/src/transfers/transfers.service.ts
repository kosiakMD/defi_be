import { Injectable } from '@nestjs/common';
import { BigNumber as BN } from 'bignumber.js';

import { DEFAULT_MULTIPLIER, getUniqueAndToLowerCaseArrayData } from '../util/util';
import {
  ERC20Token,
  ERC20Transfer,
  FinallyResponse,
  Transaction,
  TransactionsResponse,
  TransactionWithToken,
  TransactionWithTokenAndPrices,
} from './interfaces/transfers.interfaces';
import { DbService } from './repository/db.service';

@Injectable()
export class TransfersService {
  constructor(private readonly dbService: DbService) {}

  async getAllTransactionDataByAddress(addreses: string): Promise<FinallyResponse> {
    const [transfers, bscTransaction] = await Promise.all([
      this.getTransactionByAddresses(addreses),
      this.getTransactionByAddresses(addreses, 'bsc'),
    ]);

    return { transfers, bscTransaction };
  }

  async getTransactionByAddresses(addresses: string, bsc?: string): Promise<TransactionsResponse> {
    const addressArray = addresses.split(',');

    const formattedAddresses = addressArray.map((address) => `'${address}'`).join(',');

    const transferRows = await this.dbService.getTransfersDataFromDb(formattedAddresses, bsc);
    const transferRowsWithTokenPrices = await this.getTransfersWithTokenPrices(transferRows);

    return this.toTransfersResponse(transferRowsWithTokenPrices, addressArray);
  }

  private async getTransfersWithTokenPrices(
    transactions: TransactionWithToken[],
  ): Promise<TransactionWithTokenAndPrices[]> {
    const transactionWithTokenPrice = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          return {
            ...transaction,
            tokenPriceUSD: 0,
            totalPriceUSD: 0,
          };
          // TODO: get price
        } catch (_) {
          return {
            ...transaction,
            tokenPriceUSD: 0,
            totalPriceUSD: 0,
          };
        }
      }),
    );

    return await Promise.all(
      transactionWithTokenPrice.map(async (transaction) => {
        try {
          return {
            ...transaction,
            gasPriceUSD: 0,
          };

          // TODO: get price
        } catch (_) {
          return {
            ...transaction,
            gasPriceUSD: 0,
          };
        }
      }),
    );
  }

  private toTransfersResponse(
    transactions: TransactionWithTokenAndPrices[],
    addresses: string[],
  ): TransactionsResponse {
    return addresses.reduce<TransactionsResponse>((response, address) => {
      const userTransactions = transactions.filter(
        (transaction) => transaction.toAddress === address || transaction.fromAddress === address,
      );

      const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
        userTransactions.map((transaction) => transaction.hash),
      );

      const transactionWithTransfers = uniqueUserHashes.map<Transaction>((hash) => {
        const hashTransfers = userTransactions.filter((transaction) => transaction.hash === hash);

        const erc20Transfers: ERC20Transfer[] = hashTransfers.map((transfer) => {
          const tokenErc20: ERC20Token = {
            address: transfer.tokenAddress,
            name: transfer.tokenName,
            symbol: transfer.tokenSymbol,
            decimals: transfer.tokenDecimals,
            totalSupply: transfer.tokenTotalSupply,
          };
          // NOTE: Change log
          return {
            fromAddress: transfer.fromAddress,
            toAddress: transfer.toAddress,
            amount: transfer.amount,
            token: tokenErc20,
            tokenPriceUSD: transfer.tokenPriceUSD,
            totalPriceUSD: transfer.totalPriceUSD,
            logIndex: 0,
          };
        });

        return {
          hash: hashTransfers[0].hash,
          blockNumber: hashTransfers[0].blockNumber,
          blockTimeStamp: hashTransfers[0].blockTimeStamp,
          gasUsed: hashTransfers[0].gasUsed,
          gasPrice: hashTransfers[0].gasPrice,
          gasUsedEther: this.getGasUsedEther(hashTransfers[0].gasPrice, hashTransfers[0].gasUsed),
          gasUsedUSD: this.getGasUsedUSD(
            hashTransfers[0].gasPriceUSD,
            hashTransfers[0].gasUsed * +hashTransfers[0].gasPrice,
          ),
          erc20Transfers,
        };
      });

      return {
        ...response,
        [address]: transactionWithTransfers,
      };
    }, {});
  }

  private getGasUsedEther(gasPrice: number, gasUsed: number): number {
    return new BN(gasPrice)
      .multipliedBy(gasUsed) //
      .multipliedBy(DEFAULT_MULTIPLIER)
      .toNumber();
  }

  private getGasUsedUSD(gasPrice: number, gasUsed: number): number {
    return new BN(gasPrice)
      .multipliedBy(gasUsed) //
      .multipliedBy(DEFAULT_MULTIPLIER)
      .toNumber();
  }
}
