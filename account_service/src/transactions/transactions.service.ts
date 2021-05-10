import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Web3Provider } from '../chain/web3.provider';
import { BscScanService } from '../scan_api/bsc-scan.service';
import { EtherScanService } from '../scan_api/ether-scan.service';
import { ScanService } from '../scan_api/scan.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../utils/utils';
import {
  ResultStatus,
  Transaction,
  TransactionsResponse,
  TransactionsResult,
} from './interfaces/transactions.interfaces';

@Injectable()
export class TransactionsService {
  DEFAULT_MULTIPLIER = 1e-18;
  addresses: string;
  addressesArray: string[];
  manager;

  constructor(
    private readonly web3Provider: Web3Provider,
    private readonly bscScanService: BscScanService,
    private readonly etherScanService: EtherScanService,
  ) {}

  private static convertAddresses(addresses: string[]): string {
    return addresses.map((address) => `'${address}'`).join(',');
  }

  private static getUniqueAndToLowerCase(array: string[]): string[] {
    const temp: string[] = [];

    array.forEach((el) => {
      if (!temp.includes(el.toLowerCase())) {
        temp.push(el.toLowerCase());
      }
    });

    return temp;
  }

  public async getTransactions(addresses: string[]): Promise<TransactionsResponse | []> {
    if (this.isAddressesNotCorrect(addresses)) return [];

    this.prepareAddresses(addresses);
    this.manager = getManager();

    const ethTransactions = await this.loadETHTransactions();
    const bscTransactions = await this.loadBSCTransactions();

    const calculatedEthTransactions = this.calculateFields(ethTransactions, 1);
    const calculatedBscTransactions = this.calculateFields(bscTransactions, 2);
    const allTransactions = calculatedEthTransactions.concat(calculatedBscTransactions);

    return this.toTransactionsResponse(allTransactions);
  }

  private isAddressesNotCorrect(addresses: string[]): boolean {
    if (!addresses.length) {
      return true;
    }
    return !addresses.every(this.web3Provider.instanceEth().utils.isAddress);
  }

  private prepareAddresses(addresses: string[]): void {
    const uniqAddresses = TransactionsService.getUniqueAndToLowerCase(addresses);
    this.addresses = TransactionsService.convertAddresses(uniqAddresses);
    this.addressesArray = uniqAddresses;
  }

  private toTransactionsResponse(transactions): TransactionsResponse {
    return this.addressesArray.reduce((response, address) => {
      const userTransactions: Transaction[] = transactions.filter(
        (transaction) => transaction.to === address || transaction.from === address,
      );

      return {
        ...response,
        [address]: userTransactions,
      };
    }, {});
  }

  private calculateFields(transactions, chainId): Transaction[] {
    return transactions.map((transaction) => {
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

  async getTransaction(addresses: string[], chains: number) {
    const result = {
      status: ResultStatus.ok,
      errors: [],
      transactions: [],
    };
    //
    const concatTxs = (newTxs): TransactionsResult[] =>
      (result.transactions = result.transactions.concat(newTxs));

    if (chains) {
      const handleChain = async (chainId, service: ScanService): Promise<any> => {
        if (+chains === +chainId) {
          const txs = await Promise.allSettled(
            addresses.map((address) => service.getScanTransactions(address)),
          );
          txs.forEach((tx) => {
            if (tx.status === 'fulfilled') {
              concatTxs(tx.value.transactions);
              if (tx.value.error) result.errors.push(tx.value.error);
            } else {
              result.errors.push(tx.reason);
            }
          });
        }
      };
      await Promise.all([
        handleChain(CHAIN_ID_ETH, this.etherScanService),
        handleChain(CHAIN_ID_BSC, this.bscScanService),
      ]);
    } else {
      const [ethTransactions, bscTransactions] = await Promise.allSettled([
        Promise.all(addresses.map((address) => this.etherScanService.getScanTransactions(address))),
        Promise.all(addresses.map((address) => this.bscScanService.getScanTransactions(address))),
      ]);

      const checkFulfillment = (chainsTxResults): any => {
        chainsTxResults.forEach((chainTxsResult) => {
          if (chainTxsResult.status === 'fulfilled') {
            chainTxsResult.value.forEach((tx) => {
              concatTxs(tx.transactions);
              if (tx.error) result.errors.push(tx.error);
            });
          } else {
            result.errors.push(chainTxsResult.reason);
          }
        });
        if (result.errors.length) {
          result.status = ResultStatus.error;
        }
        return result;
      };

      checkFulfillment([ethTransactions, bscTransactions]);
    }

    if (result.errors.length) {
      result.status = ResultStatus.error;
    }
    return result;
  }
}
