import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { Logger } from '../Logger/Logger.service';
import { EtherscanTransfer } from '../balance/interfaces/etherscan.interfaces';
import { PriceServiceResponse } from '../price/price.interfaces';
import { PriceService } from '../price/price.service';
import {
  ResultStatus,
  Transaction,
  TransactionsResult,
} from '../transactions/interfaces/transactions.interfaces';
import {
  ERC20TokenTransfer,
  ERC20Transfer,
  Transfer,
  TransfersResponse,
} from '../transfers/interfaces/transfers.interfaces';
import { DEFAULT_MULTIPLIER, getUniqueAndToLowerCaseArrayData, totalPrice } from '../utils/utils';

const TRANSACTIONS_CACHE_TIME = 30; // 30 sec
const TRANSFERS_CACHE_TIME = 30; // 30 sec
const MAX_RETRY = 2;

export class ScanService {
  private retries: 0;
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainPrefix: 'bsc' | 'eth';
  protected readonly chainId: number;
  protected readonly mainCoinAddress: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly cacheManager: Cache,
    protected readonly logger: Logger,
    protected readonly priceService: PriceService,
  ) {}

  private formatTransfersDto(hashTransfers, contractTimestampPrices): ERC20Transfer[] {
    return hashTransfers.map((transfer) => {
      const tokenErc20: ERC20TokenTransfer = {
        address: transfer.contractAddress,
        name: transfer.tokenName,
        symbol: transfer.tokenSymbol,
        decimals: Number(transfer.tokenDecimal),
        totalSupply: transfer.tokenTotalSupply,
      };
      const tokenPriceUsd =
        contractTimestampPrices.prices[transfer.contractAddress][transfer.timeStamp];

      return {
        fromAddress: transfer.from,
        toAddress: transfer.to,
        amount: transfer.value,
        token: tokenErc20,
        tokenPriceUSD: tokenPriceUsd,
        totalPriceUSD: totalPrice(transfer.value.toString(), tokenPriceUsd, 18),
      };
    });
  }

  private normalizeTxsResp = (txsResp, chainId, isInternal = false): Transaction[] => {
    txsResp.forEach((tx) =>
      Object.assign(tx, {
        chainId: this.chainId,
        isInternal,
      }),
    );
    return txsResp;
  };

  async getTransfers(address: string): Promise<any> {
    const action = 'tokentx';

    const cacheKey = `${this.chainPrefix}_transfers_${action}_${address}`;
    const logString = `Cache ${cacheKey} is `;

    let transfers = await this.cacheManager.get<EtherscanTransfer[]>(cacheKey);

    if (!transfers || !Array.isArray(transfers)) {
      try {
        this.logger.debug(logString + 'fetching');
        const transfersResp = await this.httpService
          .get(this.url, {
            params: {
              module: 'account',
              action: action,
              address: address,
              apikey: this.apiKey,
            },
          })
          .pipe(map((response) => response.data))
          .toPromise();

        transfers = transfersResp && transfersResp.result ? transfersResp.result : [];
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<EtherscanTransfer[]>(cacheKey, transfers, {
            ttl: TRANSFERS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        transfers = await this.cacheManager.get<EtherscanTransfer[]>(cacheKey);
        if (!transfers || !Array.isArray(transfers)) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transfers;
  }

  public async toTransfersResponse(
    transfers: EtherscanTransfer[],
    addresses: string[],
  ): Promise<TransfersResponse> {
    try {
      const contractTimestampPrices = await this.getTransfersPrices(transfers);

      // TODO too hard logic - divide in methods and analysis for performance
      const result = addresses.reduce<TransfersResponse>((response, address) => {
        const userTransfers = transfers.filter(
          (transaction) => transaction.to === address || transaction.from === address,
        );

        const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
          userTransfers.map((transaction) => transaction.hash),
        );

        const transactionWithTransfers = uniqueUserHashes.map<Transfer>((hash) => {
          const hashTransfers = userTransfers.filter((transaction) => transaction.hash === hash);

          const erc20Transfers: ERC20Transfer[] = this.formatTransfersDto(
            hashTransfers,
            contractTimestampPrices,
          );

          return {
            chainId: this.chainId,
            hash: hashTransfers[0].hash,
            blockNumber: hashTransfers[0].blockNumber,
            blockTimeStamp: hashTransfers[0].timeStamp,
            gas: hashTransfers[0].gas,
            gasPrice: hashTransfers[0].gasPrice,
            gasUsed: hashTransfers[0].gas * hashTransfers[0].gasPrice * DEFAULT_MULTIPLIER,
            erc20Transfers,
          };
        });

        return Object.assign(response, {
          [address]: transactionWithTransfers,
        });
      }, {});

      this.retries = 0;
      return result;
    } catch (e) {
      if (e.response) {
        this.logger.error(e.response.data, 'toTransfersResponse');
      }
      this.logger.error(e.message, 'toTransfersResponse');
      // TODO: when this cycle should be stopped?
      if (e.response.status === 403 && this.retries < MAX_RETRY) {
        this.retries++;
        return await this.toTransfersResponse(transfers, addresses);
      } else {
        this.retries = 0;
        throw e;
      }
    }
  }

  private async getTransfersPrices(transfers: EtherscanTransfer[]): Promise<PriceServiceResponse> {
    try {
      const unpricedContracts = [];

      for (const transfer of transfers) {
        // TODO: remove await
        const transferInArray = unpricedContracts.find(
          (unpricedContract) => unpricedContract.address === transfer.contractAddress,
        );
        if (transferInArray) {
          transferInArray.timestamps.push(Number(transfer.timeStamp));
        } else {
          unpricedContracts.push({
            address: transfer.contractAddress,
            timestamps: [Number(transfer.timeStamp)],
          });
        }
      }
      return await this.priceService.getHistoricalPrices(unpricedContracts, this.chainId);
    } catch (e) {
      this.logger.error(e, 'getTransactionPrices');
      throw e;
    }
  }

  protected async getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    const cacheKey = `${this.chainPrefix}_transactions_${action}_${address}`;
    const logString = `Cache ${cacheKey} is `;

    let transactions = await this.cacheManager.get<any[]>(cacheKey);

    if (!transactions || !Array.isArray(transactions)) {
      try {
        this.logger.debug(logString + 'fetching');
        const txsResp = await this.httpService
          .get(this.url, {
            params: {
              module: 'account',
              action: action,
              address: address,
              startblock: 0,
              endblock: 99999999,
              sort: 'asc',
              apikey: this.apiKey,
            },
          })
          .pipe(map((response) => response.data))
          .toPromise();
        transactions = txsResp && txsResp.result ? txsResp.result : [];
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any[]>(cacheKey, transactions, {
            ttl: TRANSACTIONS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        transactions = await this.cacheManager.get<any[]>(cacheKey);
        if (!transactions || !Array.isArray(transactions)) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transactions;
  }

  // TODO: transaction prices are not yet required
  // private async getTransactionPrices(timestamps): Promise<PriceServiceResponse> {
  //   try {
  //     const assets = [
  //       {
  //         address: this.mainCoinAddress,
  //         timestamps: timestamps,
  //       },
  //     ];
  //     return await this.priceService.getHistoricalPrices(assets, this.chainId);
  //   } catch (e) {
  //     this.logger.error(e.message, 'getTransactionPrices');
  //     throw e;
  //   }
  // }

  public async getScanTransactions(address: string): Promise<TransactionsResult> {
    this.logger.time(`request: txlist & txlistinternal ${this.url}`);
    const [normalTxResp, internalTxResp] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: txlist & txlistinternal ${this.url}`);

    const normalTx: Transaction[] = this.normalizeTxsResp(normalTxResp, false);
    const internalTx: Transaction[] = this.normalizeTxsResp(internalTxResp, true);
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return { status: ResultStatus.ok, transactions };

    // TODO: transaction prices are not yet required
    // let prices: PriceServiceResponse;
    // try {
    //   const txTimestamps = transactions.map((tx) => Number(tx.timeStamp));
    //   prices = await this.getTransactionPrices(txTimestamps);
    // } catch (e) {
    //   let error = `Price Service Error: ${e.message}`;
    //   if (e.response) {
    //     this.logger.error(e.response.data);
    //     error += ' - ' + e.response.data.message;
    //   }
    //   this.logger.error(e.message);
    //   return {
    //     status: ResultStatus.error,
    //     error: error,
    //     transactions,
    //   };
    // }

    // transactions.forEach((tx) => {
    //   if (!Number(tx.value)) return false;
    //   const priceUSD = prices.prices[this.mainCoinAddress][tx.timeStamp];
    // const token = Number.isInteger(priceUSD) ? priceUSD : null;
    // const total = totalPrice(tx.value.toString(), priceUSD, 18);
    // Object.assign(tx, {
    //   tokenPriceUSD: token,
    //   totalPriceUSD: Number.isInteger(total) ? total : null,
    // });
    // });

    return { status: ResultStatus.ok, transactions };
  }
}
