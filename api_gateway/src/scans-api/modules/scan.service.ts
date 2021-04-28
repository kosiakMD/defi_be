import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { Logger } from '../../common/Logger/Logger.service';
import { PriceServiceResponse } from '../models/interfaces/priceServiceResponse.interface';
import { ResultStatus, TransactionsResult } from '../models/interfaces/transactions.interfaces';
import {
  TransactionWithTokenAndPrices,
  TransfersResponse,
  ERC20TokenTransfer,
  ERC20Transfer,
  Transfer,
} from '../models/interfaces/transfers.interfaces';
import { totalPrice, getTokenDecimals, getUniqueAndToLowerCaseArrayData } from './utils/utils';

export class ScanService {
  protected readonly getPricesUrl: string;
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly servicePrefix: string;
  private readonly DEFAULT_MULTIPLIER: number = 1e-18;

  constructor(
    protected readonly logger: Logger,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
  }

  protected getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    return this.httpService
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
  }

  public async getScanTransactions(address: string): Promise<TransactionsResult> {
    this.logger.time(`request: txlist & txlistinternal ${this.scanServiceUrl}`);
    const [normalTxResp, internalTxResp] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: txlist & txlistinternal ${this.scanServiceUrl}`);

    // TODO: format with no map but forEach and better check with default [] value
    const normalTx =
      normalTxResp && normalTxResp.result
        ? normalTxResp.result.map((tx) =>
            Object.assign(tx, { chainId: this.chainId, isInternal: false }),
          )
        : [];
    const internalTx =
      internalTxResp && internalTxResp.result
        ? internalTxResp.result.map((tx) =>
            Object.assign(tx, { chainId: this.chainId, isInternal: true }),
          )
        : [];
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return { status: ResultStatus.ok, transactions };

    const txTimestamps = transactions.map((tx) => tx.timeStamp);

    let prices: PriceServiceResponse;
    try {
      this.logger.time(`request: ${this.getPricesUrl}/chain=${this.chainId}`);
      prices = await this.httpService
        .post(this.getPricesUrl, {
          currency: 1,
          chain: this.chainId,
          addresses: [this.mainCoinAddress],
          timestamps: txTimestamps,
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
      Object.assign(tx, {
        [`${this.servicePrefix}PriceUSD`]: priceUSD,
        tokenPriceUSD: priceUSD,
        totalPriceUSD: totalPrice(tx.value.toString(), priceUSD, 18),
      });
    });

    return { status: ResultStatus.ok, transactions };
  }

  public async getTransfersByAddresses(addressArray): Promise<TransactionWithTokenAndPrices> {
    const transferRows = await Promise.all(
      addressArray.map((address) => this.getTransfers(address)),
    );
    const transferRowsWithTokenPrices = await this.getTransfersWithTokenPrices(transferRows);

    return transferRowsWithTokenPrices[0];
  }

  protected getTransfers(address, ECR20 = false): Promise<any> {
    const protocol = ECR20 ? 'tokennfttx' : 'tokentx';
    return this.httpService
      .get(this.scanServiceUrl, {
        params: {
          module: 'account',
          action: protocol,
          address: address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: this.scanServiceKey,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
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
      const transferTimestamps = [];

      for (const transfer of transactions) {
        if (!unpricedContracts.includes(transfer['contractAddress'])) {
          unpricedContracts.push(transfer['contractAddress']);
        }
        if (!transferTimestamps.includes(transfer['timeStamp'])) {
          transferTimestamps.push(transfer['timeStamp']);
        }
      }

      this.logger.time(`request: ${this.getPricesUrl}`);

      const contractTimestampPrices = await this.httpService
        .post(this.getPricesUrl, {
          currencyId: 1,
          chainId: this.chainId,
          addresses: unpricedContracts,
          timestamps: transferTimestamps,
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${this.getPricesUrl}`);

      return addresses.reduce<TransfersResponse>((response, address) => {
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
    } catch (e) {
      if (e.response) {
        this.logger.error(e.response.data);
      }
      this.logger.error(e.message);
      if (e.response.status === 403) {
        this.toTransfersResponse(transactions, addresses);
      }
    }
  }
}
