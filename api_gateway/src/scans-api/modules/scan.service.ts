import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { Logger } from '../../common/Logger/Logger.service';
import { Transaction } from '../../transactions/transactions.interfaces';
import { PriceServiceResponse } from '../models/interfaces/priceServiceResponse.interface';
import { ResultStatus, TransactionsResult } from '../models/interfaces/transactions.interfaces';
import {
  ERC20TokenTransfer,
  ERC20Transfer,
  TransactionWithTokenAndPrices,
  Transfer,
  TransfersResponse,
} from '../models/interfaces/transfers.interfaces';
import { getTokenDecimals, getUniqueAndToLowerCaseArrayData, totalPrice } from './utils/utils';

const TRANSACTIONS_CACHE_TIME = 30; // 30 sec
const TRANSFERS_CACHE_TIME = 30; // 30 sec
const MAX_RETRY = 2;

export class ScanService {
  private retries: 0;
  protected readonly getPricesUrl: string;
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly chainPrefix: 'bsc' | 'eth';
  private readonly DEFAULT_MULTIPLIER: number = 1e-18;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly cacheManager: Cache,
    protected readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}/batch`;
  }

  protected async getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    const transactionCacheKey = `${this.chainPrefix}_transactions_${action}_${address}`;
    const logString = `Cache ${this.chainPrefix} ${action} transactions of: ${address} is `;

    let transactions = await this.cacheManager.get<any[]>(transactionCacheKey);

    if (!transactions) {
      try {
        this.logger.debug(logString + 'fetching');
        const txsResp = await this.httpService
          .get(this.scanServiceUrl, {
            params: {
              module: 'account',
              action: action,
              address: address,
              startblock: 0,
              endblock: 99999999,
              sort: 'asc',
              apikey: this.scanServiceKey,
            },
          })
          .pipe(map((response) => response.data))
          .toPromise();
        transactions = txsResp && txsResp.result ? txsResp.result : [];
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any[]>(transactionCacheKey, transactions, {
            ttl: TRANSACTIONS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        transactions = await this.cacheManager.get<any[]>(transactionCacheKey);
        if (!transactions) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transactions;
  }

  private normalizeTxsResp = (txsResp, chainId, isInternal = false): Transaction[] => {
    txsResp.forEach((tx) =>
      Object.assign(tx, {
        [`${this.chainPrefix}PriceUSD`]: null,
        tokenPriceUSD: null,
        totalPriceUSD: null,
        chainId: this.chainId,
        isInternal,
      }),
    );
    return txsResp;
  };

  public async getScanTransactions(address: string): Promise<TransactionsResult> {
    this.logger.time(`request: txlist & txlistinternal ${this.scanServiceUrl}`);
    const [normalTxResp, internalTxResp] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: txlist & txlistinternal ${this.scanServiceUrl}`);

    const normalTx: Transaction[] = this.normalizeTxsResp(normalTxResp, false);
    const internalTx: Transaction[] = this.normalizeTxsResp(internalTxResp, true);
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return { status: ResultStatus.ok, transactions };

    const txTimestamps = transactions.map((tx) => Number(tx.timeStamp));

    let prices: PriceServiceResponse;
    try {
      this.logger.time(`request: ${this.getPricesUrl}/chain=${this.chainId}`);

      const assets = [
        {
          address: this.mainCoinAddress,
          timestamps: txTimestamps,
        },
      ];

      prices = await this.httpService
        .post(this.getPricesUrl, {
          currency: 1,
          chain: this.chainId,
          assets: assets,
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${this.getPricesUrl}/chain=${this.chainId}`);
    } catch (e) {
      let error = `Price Service Error: ${e.message}`;
      if (e.response) {
        this.logger.error(e.response.data);
        error += ' - ' + e.response.data.message;
      }
      this.logger.error(e.message);
      return {
        status: ResultStatus.error,
        error: error,
        transactions,
      };
    }

    transactions.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const priceUSD = prices.prices[this.mainCoinAddress][tx.timeStamp];
      // TODO: measure
      // tx[`${this.servicePrefix}PriceUSD`] = priceUSD || null;
      // tx.tokenPriceUSD = priceUSD || null;
      // tx.totalPriceUSD = totalPrice(tx.value.toString(), priceUSD, 18) || null;
      Object.assign(tx, {
        [`${this.chainPrefix}PriceUSD`]: priceUSD || null,
        tokenPriceUSD: priceUSD || null,
        totalPriceUSD: totalPrice(tx.value.toString(), priceUSD, 18) || null,
      });
    });

    return { status: ResultStatus.ok, transactions };
  }

  public async getTransfersByAddresses(addressArray): Promise<TransactionWithTokenAndPrices> {
    const transferRows = await Promise.all(
      addressArray.map((address) => this.getTransfers(address)),
    );
    const transferRowsWithTokenPrices = this.getTransfersWithTokenPrices(transferRows);

    return transferRowsWithTokenPrices[0];
  }

  protected async getTransfers(address, ECR20 = false): Promise<any> {
    const action = ECR20 ? 'tokennfttx' : 'tokentx';
    // TODO: create function keys generator
    const transfersCacheKey = `${this.chainPrefix}_transfers_${action}_${address}`;
    const logString = `Cache ${this.chainPrefix} ${action} transfers of: ${address} is `;

    let transfers = await this.cacheManager.get<any[]>(transfersCacheKey);

    if (!transfers) {
      try {
        this.logger.debug(logString + 'fetching');
        const transfersResp = await this.httpService
          .get(this.scanServiceUrl, {
            params: {
              module: 'account',
              action: action,
              address: address,
              startblock: 0,
              endblock: 99999999,
              sort: 'asc',
              apikey: this.scanServiceKey,
            },
          })
          .pipe(map((response) => response.data))
          .toPromise();
        transfers = transfersResp && transfersResp.result ? transfersResp.result : [];
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any[]>(transfersCacheKey, transfers, {
            ttl: TRANSFERS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        transfers = await this.cacheManager.get<any[]>(transfersCacheKey);
        if (!transfers) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transfers;
  }

  protected async getTransfersWithTokenPrices(
    transactions,
  ): Promise<TransactionWithTokenAndPrices[]> {
    return await Promise.all(
      transactions.map(async (transaction) => {
        const decimals = getTokenDecimals(transaction.tokenDecimals);

        try {
          return {
            ...transaction,
            tokenPriceUSD: transaction.tokenPrice || 0,
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

  // TODO: toTransfersResponse is not async!!!
  public async checkTransferResponse(resp, addresses): Promise<TransfersResponse> {
    if (Number(resp['status'])) {
      const transferResponse = await this.toTransfersResponse(resp['result'], addresses);
      return transferResponse;
    } else {
      return this.toTransfersResponse([], []);
    }
  }

  public combineResults = (resultArray, chainArray): any => {
    if (chainArray && Object.keys(chainArray).length > 0) {
      for (const transfer of Object.keys(chainArray)) {
        if (Object.keys(resultArray).includes(transfer)) {
          resultArray[transfer] = resultArray[transfer].concat(chainArray[transfer]);
        } else {
          resultArray[transfer] = chainArray[transfer];
        }
      }
    }
  };

  public async toTransfersResponse(
    transactions: TransactionWithTokenAndPrices[],
    addresses: string[],
  ): Promise<TransfersResponse> {
    try {
      const unpricedContracts = [];

      for (const transfer of transactions) {
        // TODO: remove await
        const transferInArray = await unpricedContracts.find(
          (unpricedContract) => unpricedContract.address === transfer['contractAddress'],
        );
        if (transferInArray) {
          transferInArray.timestamps.push(Number(transfer['timeStamp']));
        } else {
          unpricedContracts.push({
            address: transfer['contractAddress'],
            timestamps: [Number(transfer['timeStamp'])],
          });
        }
      }

      this.logger.time(`request: ${this.getPricesUrl}`);

      const contractTimestampPrices = await this.httpService
        .post(this.getPricesUrl, {
          currency: 1,
          chain: this.chainId,
          assets: unpricedContracts,
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${this.getPricesUrl}`);

      // TODO too hard logic - divide in methods and analysis for performance
      const result = addresses.reduce<TransfersResponse>((response, address) => {
        const userTransactions = transactions.filter(
          (transaction) => transaction['to'] === address || transaction['from'] === address,
        );

        const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
          userTransactions.map((transaction) => transaction.hash),
        );

        const transactionWithTransfers = uniqueUserHashes.map<Transfer>((hash) => {
          const hashTransfers = userTransactions.filter((transaction) => transaction.hash === hash);

          const erc20Transfers: ERC20Transfer[] = hashTransfers.map((transfer) => {
            const tokenErc20: ERC20TokenTransfer = {
              address: transfer['contractAddress'],
              name: transfer.tokenName,
              symbol: transfer.tokenSymbol,
              decimals: Number(transfer['tokenDecimal']),
              totalSupply: transfer.tokenTotalSupply,
            };
            const tokenPriceUsd =
              contractTimestampPrices.prices[transfer['contractAddress']][transfer['timeStamp']];

            return {
              fromAddress: transfer['from'],
              toAddress: transfer['to'],
              amount: transfer['value'],
              token: tokenErc20,
              tokenPriceUSD: tokenPriceUsd,
              totalPriceUSD: totalPrice(transfer['value'].toString(), tokenPriceUsd, 18),
            };
          });

          return {
            chainId: this.chainId,
            hash: hashTransfers[0].hash,
            blockNumber: hashTransfers[0].blockNumber,
            blockTimeStamp: hashTransfers[0]['timeStamp'],
            gas: hashTransfers[0].gas,
            gasPrice: hashTransfers[0].gasPrice,
            gasUsed: hashTransfers[0].gas * hashTransfers[0].gasPrice * this.DEFAULT_MULTIPLIER,
            erc20Transfers,
          };
        });

        return {
          ...response,
          [address]: transactionWithTransfers,
        };
      }, {});

      this.retries = 0;
      return result;
    } catch (e) {
      if (e.response) {
        this.logger.error(e.response.data);
      }
      this.logger.error(e.message);
      // TODO: when this cycle should be stopped?
      if (e.response.status === 403 && this.retries < MAX_RETRY) {
        this.retries++;
        return await this.toTransfersResponse(transactions, addresses);
      } else {
        this.retries = 0;
        throw e;
      }
    }
  }
}
