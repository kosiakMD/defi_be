import { Injectable } from '@nestjs/common';

import {
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  getTokenDecimals,
  getUniqueAndToLowerCaseArrayData,
} from '../utils/utils';
import {
  ERC20TokenTransfer,
  ERC20Transfer,
  TransfersResponse,
  TransactionWithToken,
  TransactionWithTokenAndPrices,
  Transfer,
} from './interfaces/transfers.interfaces';
import { DbService } from './repository/db.service';

@Injectable()
export class TransfersService {
  constructor(private readonly dbService: DbService) {}

  async getAllTransactionDataByAddress(addresses: string): Promise<TransfersResponse> {
    const addressArray = getUniqueAndToLowerCaseArrayData(addresses.split(','));

    const [transfers, bscTransaction] = await Promise.all([
      this.getTransactionByAddresses(addressArray, CHAIN_ID_ETH),
      this.getTransactionByAddresses(addressArray, CHAIN_ID_BSC),
    ]);

    const allTransfersResponse: TransfersResponse = {};

    Object.keys(transfers).forEach((key) => {
      allTransfersResponse[key] = [...transfers[key], ...bscTransaction[key]];
    });

    return allTransfersResponse;
  }

  async getTransactionByAddresses(
    addressArray: string[],
    chainId: number,
  ): Promise<TransfersResponse> {
    const formattedAddresses = addressArray.map((address) => `'${address}'`).join(',');

    const transferRows = await this.dbService.getTransfersDataFromDb(formattedAddresses, chainId);
    const transferRowsWithTokenPrices = await this.getTransfersWithTokenPrices(transferRows);

    return this.toTransfersResponse(transferRowsWithTokenPrices, addressArray, chainId);
  }

  private async getTransfersWithTokenPrices(
    transactions: TransactionWithToken[],
  ): Promise<TransactionWithTokenAndPrices[]> {
    return await Promise.all(
      transactions.map(async (transaction) => {
        const decimals = getTokenDecimals(transaction.tokenDecimals);

        try {
          return {
            ...transaction,
            tokenPriceUSD: transaction.tokenPrice,
            totalPriceUSD: transaction.amount * decimals * transaction.tokenPrice,
          };
        } catch (_) {
          return {
            ...transaction,
            tokenPriceUSD: 0,
            totalPriceUSD: 0,
          };
        }
      }),
    );
  }

  private toTransfersResponse(
    transactions: TransactionWithTokenAndPrices[],
    addresses: string[],
    chainId: number,
  ): TransfersResponse {
    return addresses.reduce<TransfersResponse>((response, address) => {
      const userTransactions = transactions.filter(
        (transaction) => transaction.toAddress === address || transaction.fromAddress === address,
      );

      const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
        userTransactions.map((transaction) => transaction.hash),
      );

      const transactionWithTransfers = uniqueUserHashes.map<Transfer>((hash) => {
        const hashTransfers = userTransactions.filter((transaction) => transaction.hash === hash);
        const erc20Transfers: ERC20Transfer[] = hashTransfers.map((transfer) => {
          const decimals = getTokenDecimals(transfer.tokenDecimals);

          const tokenErc20: ERC20TokenTransfer = {
            address: transfer.tokenAddress,
            name: transfer.tokenName,
            symbol: transfer.tokenSymbol,
            decimals: transfer.tokenDecimals,
            totalSupply: transfer.tokenTotalSupply,
            amount: {
              decimals: transfer.amount * decimals,
              usd: transfer.amount * decimals * transfer.tokenPrice,
            },
          };
          // NOTE: Change log
          return {
            fromAddress: transfer.fromAddress,
            toAddress: transfer.toAddress,
            amount: transfer.amount,
            token: tokenErc20,
            tokenPriceUSD: transfer.tokenPriceUSD,
            totalPriceUSD: transfer.totalPriceUSD,
          };
        });

        const decimals = getTokenDecimals(hashTransfers[0].tokenDecimals);

        return {
          chainId: chainId,
          hash: hashTransfers[0].hash,
          blockNumber: hashTransfers[0].blockNumber,
          blockTimeStamp: hashTransfers[0].blockTimeStamp,
          gasUsed: hashTransfers[0].gasUsed,
          gas: {
            price: hashTransfers[0].gasPrice * decimals,
            eth: hashTransfers[0].gasUsed * decimals * hashTransfers[0].gasPrice,
            usd:
              hashTransfers[0].gasUsed *
              decimals *
              hashTransfers[0].tokenPrice *
              hashTransfers[0].gasPrice,
          },
          erc20Transfers,
        };
      });

      return {
        ...response,
        [address]: transactionWithTransfers,
      };
    }, {});
  }
}
