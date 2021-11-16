import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';

import { HttpService, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { DEFAULT_MULTIPLIER } from '@app/common/constant';
import { ChainIdEnum, ChainAbbrEnum, ResultStatus } from '@app/common/enum';
import { Address } from '@app/common/types';

import { HistoricalPricesMap } from '../balance/dto/price.response.dto';
import { PriceServiceResponse } from '../price/price.interfaces';
import { PriceService } from '../price/price.service';
import {
  Transaction,
  TransactionsResult,
} from '../transactions/interfaces/transactions.interfaces';
import {
  ERC20TokenTransfer,
  ERC20Transfer,
  ScanTransfer,
  TransfersResponse,
} from '../transfers/interfaces/transfers.interfaces';
import {
  EXCLUDE_TRANSFER_TOKEN_ADDRESSES,
  getUniqueAndToLowerCaseArrayData,
  totalPrice,
  transactionFeeUSD,
  transferTokenAddressNotIn,
} from '../utils/utils';
import { EtherscanTransfer } from './ether.scan.interfaces';
import { EtherScanTransactionResponseDto } from './ether.scan.transaction.response.dto';

const TRANSACTIONS_CACHE_TIME = 30; // 30 sec
const TRANSFERS_CACHE_TIME = 30; // 30 sec
const MAX_RETRY = 2;

export class ScanApiService {
  private retries: 0;
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainAbbr: ChainAbbrEnum;
  protected readonly chainId: ChainIdEnum;
  protected readonly mainCoinAddress: Address;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    protected readonly priceService: PriceService,
  ) {}

  private formatTransfersDto(hashTransfers): ERC20Transfer[] {
    return hashTransfers.map((transfer) => {
      const tokenErc20: ERC20TokenTransfer = {
        address: transfer.contractAddress,
        name: transfer.tokenName,
        symbol: transfer.tokenSymbol,
        decimals: Number(transfer.tokenDecimal),
        totalSupply: transfer.tokenTotalSupply,
      };

      return {
        fromAddress: transfer.from,
        toAddress: transfer.to,
        amount: transfer.value,
        token: tokenErc20,
        tokenPriceUSD: null,
        totalPriceUSD: null,
      };
    });
  }

  private normalizeTxsResp = (txsResp, chainId, isInternal = false): Transaction[] => {
    txsResp.forEach((tx) =>
      Object.assign(tx, {
        feeUSD: null,
        coinPriceUSD: null,
        valueUSD: null,
        chainId: this.chainId,
        isInternal,
      }),
    );
    return txsResp;
  };

  async getTransfers(address: string): Promise<any> {
    const action = 'tokentx';

    const cacheKey = `${this.chainAbbr}_transfers_${action}_${address}`;
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
      // TODO too hard logic - divide in methods and analysis for performance
      const result = addresses.reduce<TransfersResponse>((response, address) => {
        const userTransfers = transfers.filter(
          (transaction) =>
            (transaction.to === address || transaction.from === address) &&
            transferTokenAddressNotIn(
              transaction.contractAddress,
              EXCLUDE_TRANSFER_TOKEN_ADDRESSES,
            ),
        );

        const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
          userTransfers.map((transaction) => transaction.hash),
        );

        const transactionWithTransfers = uniqueUserHashes.map<ScanTransfer>((hash) => {
          const hashTransfers = userTransfers.filter((transaction) => transaction.hash === hash);

          const erc20Transfers: ERC20Transfer[] = this.formatTransfersDto(hashTransfers);

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

  protected async fetchTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    const cacheKey = `${this.chainAbbr}_transactions_${action}_${address}`;
    const logString = `Cache ${cacheKey} is `;

    let transactions = await this.cacheManager.get<any[]>(cacheKey);

    if (!transactions || !Array.isArray(transactions)) {
      try {
        this.logger.debug(logString + 'fetching');
        const txsResp = await this.httpService
          .get<{ result: any | any[] }>(this.url, {
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
          .pipe(map((response) => plainToClass(EtherScanTransactionResponseDto, response.data)))
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

  private async getTransactionPrices(
    timestamps,
  ): Promise<PriceServiceResponse<HistoricalPricesMap>> {
    try {
      const assets = [
        {
          address: this.mainCoinAddress,
          timestamps: timestamps,
        },
      ];
      return await this.priceService.getHistoricalPrices(assets, this.chainId);
    } catch (e) {
      this.logger.error(e.message, 'getTransactionPrices');
      throw e;
    }
  }

  public async getScanTransactions(address: string): Promise<TransactionsResult> {
    this.logger.time(`request: txlist & txlistinternal ${this.url}`);
    const [normalTxResp, internalTxResp] = await Promise.all([
      this.fetchTransactions(address),
      this.fetchTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: txlist & txlistinternal ${this.url}`);

    const normalTx: Transaction[] = this.normalizeTxsResp(normalTxResp, false);
    const internalTx: Transaction[] = this.normalizeTxsResp(internalTxResp, true);
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return { status: ResultStatus.ok, data: transactions };

    let prices: PriceServiceResponse<HistoricalPricesMap>;
    try {
      const txTimestamps = transactions.map((tx) => Number(tx.timeStamp));
      prices = await this.getTransactionPrices(txTimestamps);
    } catch (e) {
      let error = `Price Service Error: ${e.message}`;
      if (e.response) {
        this.logger.error(e.response.data);
        error += ' - ' + e.response.data.message;
      }
      this.logger.error(e.message);
      return {
        status: ResultStatus.error,
        errors: error,
        data: transactions,
      };
    }

    transactions.forEach((tx) => {
      const price = prices.prices.has(this.mainCoinAddress)
        ? prices.prices.get(this.mainCoinAddress)[tx.timeStamp]
        : 0;
      const valueUSD = totalPrice(tx.value.toString(), price, 18);
      const feeUSD = transactionFeeUSD(tx.gasPrice, tx.gasUsed, 18, price);
      Object.assign(tx, {
        feeUSD: feeUSD ? feeUSD : null,
        coinPriceUSD: price ? price : null,
        valueUSD: valueUSD ? valueUSD : null,
      });
    });

    return { status: ResultStatus.ok, data: transactions };
  }
}
