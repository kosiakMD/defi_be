import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Web3Provider } from '../chain/web3.provider';
import { Transaction, TransactionsResponse } from './interfaces/transactions.interfaces';

@Injectable()
export class TransactionsService {
  DEFAULT_MULTIPLIER = 1e-18;
  addresses: string;
  addressesArray: string[];
  manager;

  constructor(private readonly web3Provider: Web3Provider) {}

  public async getTransactions(addresses: string[]): Promise<TransactionsResponse> {
    if (this.isAdderessesNotCorrect(addresses)) return [];

    this.prepareAdderesses(addresses);
    this.manager = getManager();

    const ethTransactions = await this.loadETHTransactions();
    const bscTransactions = await this.loadBSCTransactions();

    const calculatedEthTransactions = this.calculateFields(ethTransactions, 1);
    const calculatedBscTransactions = this.calculateFields(bscTransactions, 2);
    const allTransactions = calculatedEthTransactions.concat(calculatedBscTransactions);

    return this.toTransactionsResponse(allTransactions);
  }

  private isAdderessesNotCorrect(addresses: string[]): boolean {
    if (!addresses.length) {
      return true;
    }
    if (!addresses.every(this.web3Provider.instanceEth().utils.isAddress)) {
      return true;
    }
    return false;
  }

  private prepareAdderesses(addresses: string[]): void {
    addresses = this.getUniqueAndToLowerCase(addresses);
    this.addresses = this.convertAddresses(addresses);
    this.addressesArray = addresses;
  }

  private convertAddresses(addresses: string[]): string {
    return addresses.map(address => `'${address}'`).join(',');
  }

  private getUniqueAndToLowerCase(array: string[]): string[] {
    const temp: string[] = [];

    array.forEach((el) => {
      if (!temp.includes(el.toLowerCase())) {
        temp.push(el.toLowerCase());
      }
    });

    return temp;
  }

  private toTransactionsResponse(transactions): TransactionsResponse {
    return this.addressesArray.reduce((response, address) => {
      const userTransactions: Transaction[] = transactions.filter(
        (transaction) => transaction.to === address || transaction.from === address,
      );

      return {
        ...response,
        [address]: userTransactions
      };
    }, {});
  }

  private calculateFields(transactions, chainId): Transaction[] {
    return transactions.map(transaction => {
      return {
        chainId,
        hash: transaction.hash,
        blockNumber: transaction.blocknumber,
        from: transaction.fromaddress,
        to: transaction.toaddress,
        blockTimestamp: transaction.blocktimestamp,
        amount: {
          eth: transaction.amount * this.DEFAULT_MULTIPLIER,
          usd: transaction.amount * this.DEFAULT_MULTIPLIER * transaction.price,
        },
        gas: {
          price: transaction.gasprice * this.DEFAULT_MULTIPLIER,
          eth: transaction.gasused * this.DEFAULT_MULTIPLIER * transaction.gasprice,
          usd:
            transaction.gasused *
            this.DEFAULT_MULTIPLIER *
            transaction.price *
            transaction.gasprice,
        },
      };
    });
  }

  private loadETHTransactions(): Promise<any> {
    return this.manager.query(`
    SELECT
      hash,
      t."blockNumber" as blockNumber,
      t."fromAddress" as fromAddress,
      t."toAddress" as toAddress,
      t."blockTimestamp" as blockTimestamp,
      gas,
      t."gasPrice" as gasPrice,
      t."gasUsed" as gasUsed,
      amount,
      ethprice as price
    FROM transactionseth AS t
    WHERE t."fromAddress" IN (${this.addresses})
    OR t."toAddress" IN (${this.addresses})
    `);
  }

  private loadBSCTransactions(): Promise<any> {
    return this.manager.query(`
    SELECT
      hash,
      t."blockNumber" as blockNumber,
      t."fromAddress" as fromAddress,
      t."toAddress" as toAddress,
      t."blockTimestamp" as blockTimestamp,
      gas,
      t."gasPrice" as gasPrice,
      t."gasUsed" as gasUsed,
      amount,
      bnbprice as price
    FROM bsc_transactions AS t
    WHERE t."fromAddress" IN (${this.addresses})
    OR t."toAddress" IN (${this.addresses})
    `);
  }
}
