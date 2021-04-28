import { Injectable } from '@nestjs/common';

import { EtherscanApi } from './api/etherscan.api';
import { Transaction, TransactionsResponse } from './interfaces/api.transactions.interfaces';
import { Web3Service } from './web3.service';

@Injectable()
export class EtherscanTransactionsService {
  constructor(
    private readonly etherscan: EtherscanApi,
    private readonly web3Service: Web3Service,
  ) {}

  public async getTransactions(addresses: string[]): Promise<TransactionsResponse | []> {
    if (this.isAddressesNotCorrect(addresses)) return [];

    return this.toTransactionsResponse(addresses, 'normal');
  }

  public async getInternalTransactions(addresses: string[]): Promise<TransactionsResponse | []> {
    if (this.isAddressesNotCorrect(addresses)) return [];

    return this.toTransactionsResponse(addresses, 'internal');
  }

  private isAddressesNotCorrect(addresses: string[]): boolean {
    if (!addresses.length) {
      return true;
    }
    return !addresses.every(this.web3Service.web3.utils.isAddress);
  }

  private async toTransactionsResponse(
    addresses: string[],
    type: string,
  ): Promise<TransactionsResponse> {
    return (
      await Promise.all(
        addresses.map(async (address) => {
          const transactions = await this.getAndformatTransactions(address, type);

          return {
            [address]: transactions,
          };
        }),
      )
    ).reduce((acc, transaction) => {
      return Object.assign(acc, transaction);
    }, {});
  }

  private async getAndformatTransactions(address: string, type: string): Promise<Transaction[]> {
    let transactions;

    if (type === 'internal') {
      transactions = await this.etherscan.getInternalTransactions(address.toLowerCase());
    }
    if (type === 'normal') {
      transactions = await this.etherscan.getTransactions(address.toLowerCase());
    }
    if (typeof transactions !== 'object') {
      transactions = [];
    }

    return transactions.map(
      ({
        blockNumber,
        timeStamp,
        hash,
        nonce,
        blockHash,
        transactionIndex,
        from,
        to,
        value,
        gas,
        gasPrice,
        isError,
        // eslint-disable-next-line
      txreceipt_status,
        input,
        contractAddress,
        cumulativeGasUsed,
        gasUsed,
        confirmations,
      }) => {
        return {
          blockNumber,
          timeStamp,
          hash,
          nonce,
          blockHash,
          transactionIndex,
          from,
          to,
          value,
          gas,
          gasPrice,
          isError,
          // eslint-disable-next-line
        txreceiptStatus: txreceipt_status,
          input,
          contractAddress,
          cumulativeGasUsed,
          gasUsed,
          confirmations,
          chainId: 1,
          isInternal: type === 'internal' ? true : undefined,
        };
      },
    );
  }
}
