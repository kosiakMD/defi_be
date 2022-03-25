import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainAbbrEnum, ChainIdEnum, ResultStatus } from '@app/common/enum';

import { Transaction } from '../../transactions/interfaces/transactions.interfaces';
import { TransactionsDetailedResponseDto } from '../dto/scans-api.dto';
import { getUniqueAndToLowerCaseArrayData, totalPrice } from './utils/utils';

const TRANSACTIONS_CACHE_TIME_SEC = 30;
const TRANSFERS_CACHE_TIME_SEC = 30;
const MAX_RETRY = 2;

export class ScanService {
  protected readonly getPricesUrl: string;
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: ChainIdEnum;
  protected readonly chainPrefix: ChainAbbrEnum;
  private retries: 0;
  private readonly DEFAULT_MULTIPLIER: number = 1e-18;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly cacheManager: Cache,
    protected readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<number>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}/batch`;
  }

  // TODO: Transaction service
  public async getScanTransactions(address: string): Promise<TransactionsDetailedResponseDto> {
    this.logger.time(`request: txlist & txlistinternal ${this.scanServiceUrl}`);
    const [normalTxResp, internalTxResp] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: txlist & txlistinternal ${this.scanServiceUrl}`);

    const normalTx: Transaction[] = this.normalizeTxsResp(normalTxResp, false);
    const internalTx: Transaction[] = this.normalizeTxsResp(internalTxResp, true);
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length)
      return new TransactionsDetailedResponseDto(ResultStatus.ok, [], transactions);

    let prices;
    try {
      const txTimestamps = transactions.map((tx) => Number(tx.timeStamp));
      prices = await this.getTransactionPrices(txTimestamps);
    } catch (e: any) {
      let error = `Price Service Error: ${e.message}`;
      if (e.response) {
        this.logger.error(e.response.data);
        error += ' - ' + e.response.data.message;
      }
      this.logger.error(e.message);
      return new TransactionsDetailedResponseDto(ResultStatus.error, [error], transactions);
    }

    transactions.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const priceUSD = prices.prices[this.mainCoinAddress][tx.timeStamp];
      // TODO: measure
      // tx.tokenPriceUSD = token;
      // tx.totalPriceUSD = Number.isInteger(total) ? total : null;
      const token = Number.isInteger(priceUSD) ? priceUSD : null;
      const total = totalPrice(tx.value.toString(), priceUSD, 18);
      Object.assign(tx, {
        tokenPriceUSD: token,
        totalPriceUSD: Number.isInteger(total) ? total : null,
      });
    });

    return new TransactionsDetailedResponseDto(ResultStatus.ok, [], transactions);
  }

  // TODO: Transfers service
  public async getTransfersByAddresses(addressArray): Promise<any[]> {
    try {
      // TransactionWithTokenAndPrices
      const transfers = await Promise.all<any[]>(
        addressArray.map((address) => this.getTransfers(address)),
      );
      return transfers.flat();
    } catch (e: any) {
      this.logger.error(e, 'getTransfersByAddresses');
      throw e;
    }
  }

  public async toTransfersResponse(transfers: any[], addresses: string[]): Promise<any> {
    try {
      const contractTimestampPrices = await this.getTransfersPrices(transfers);

      // TODO too hard logic - divide in methods and analysis for performance
      const result = addresses.reduce((response, address) => {
        const userTransfers = transfers.filter(
          (transaction) => transaction.to === address || transaction.from === address,
        );

        const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
          userTransfers.map((transaction) => transaction.hash),
        );

        const transactionWithTransfers = uniqueUserHashes.map((hash) => {
          const hashTransfers = userTransfers.filter((transaction) => transaction.hash === hash);

          const erc20Transfers: any[] = this.formatTransfersDto(
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
            gasUsed: hashTransfers[0].gas * hashTransfers[0].gasPrice * this.DEFAULT_MULTIPLIER,
            erc20Transfers,
          };
        });

        return Object.assign(response, {
          [address]: transactionWithTransfers,
        });
      }, {});

      this.retries = 0;
      return result;
    } catch (e: any) {
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

  protected async getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    const cacheKey = `${this.chainPrefix}_transactions_${action}_${address}`;
    const logString = `Cache ${cacheKey} is `;

    let transactions = await this.cacheManager.get<any[]>(cacheKey);

    if (!transactions || !Array.isArray(transactions)) {
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
          await this.cacheManager.set<any[]>(cacheKey, transactions, {
            ttl: TRANSACTIONS_CACHE_TIME_SEC,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e: any) {
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

  // TODO: Transfers service
  protected async getTransfers(address, ECR20 = false): Promise<any> {
    const action = ECR20 ? 'tokennfttx' : 'tokentx';
    // TODO: create function keys generator
    const cacheKey = `${this.chainPrefix}_transfers_${action}_${address}`;
    const logString = `Cache ${cacheKey} is `;

    let transfers = await this.cacheManager.get<any[]>(cacheKey);

    if (!transfers || !Array.isArray(transfers)) {
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
          .pipe(
            map((response) => {
              this.logger.debug(response.request.res.responseUrl);
              return response.data;
            }),
          )
          .toPromise();

        transfers = transfersResp && transfersResp.result ? transfersResp.result : [];
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any[]>(cacheKey, transfers, {
            ttl: TRANSFERS_CACHE_TIME_SEC,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e: any) {
        // if no data and request failed - m.b. data was wrote by another process
        transfers = await this.cacheManager.get<any[]>(cacheKey);
        if (!transfers || !Array.isArray(transfers)) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transfers;
  }

  private async getPrices(assets): Promise<any> {
    try {
      this.logger.time(`request: chain=${this.chainId} ${this.getPricesUrl}`);
      const prices = await this.httpService
        .post(this.getPricesUrl, {
          currency: 1,
          chain: this.chainId,
          assets: assets,
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: chain=${this.chainId} ${this.getPricesUrl}`);
      return prices;
    } catch (e: any) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      this.logger.error(e.message, 'getPrices');
      throw e;
    }
  }

  private async getTransactionPrices(timestamps): Promise<any> {
    try {
      const assets = [
        {
          address: this.mainCoinAddress,
          timestamps: timestamps,
        },
      ];
      return await this.getPrices(assets);
    } catch (e: any) {
      this.logger.error(e.message, 'getTransactionPrices');
      throw e;
    }
  }

  private async getTransfersPrices(transfers: any[]): Promise<any> {
    try {
      const unpricedContracts = [];

      for (const transfer of transfers) {
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
      return await this.getPrices(unpricedContracts);
    } catch (e: any) {
      this.logger.error(e, 'getTransactionPrices');
      throw e;
    }
  }

  private normalizeTxsResp = (txsResp, chainId, isInternal = false): Transaction[] => {
    txsResp.forEach((tx) =>
      Object.assign(tx, {
        tokenPriceUSD: null,
        totalPriceUSD: null,
        chainId: this.chainId,
        isInternal,
      }),
    );
    return txsResp;
  };

  private formatTransfersDto(hashTransfers, contractTimestampPrices): any[] {
    return hashTransfers.map((transfer) => {
      const tokenErc20 = {
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
}
