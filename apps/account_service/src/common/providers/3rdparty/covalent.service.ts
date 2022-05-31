import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CurrencyEnum } from '@app/common/enum';
import { Logger } from '@app/common/logger/logger.service';
import { Address } from '@app/common/types';

import { Covalent } from '../../interfaces/covalent.interface';

const TRANSACTIONS_PER_PAGE = 10e3;

export class CovalentService {
  protected readonly url: string;
  protected readonly apiKey: string;

  private getBalanceUrl(address: Address, chainId: number): string {
    return `${this.url}/${chainId}/address/${address}/balances_v2/`;
  }

  private getTransactionUrl(address: Address, chainId: number): string {
    return `${this.url}/${chainId}/address/${address}/transactions_v2/`;
  }

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    this.url = this.configService.get<string>('COVALENT_URL');
    this.apiKey = this.configService.get<string>('COVALENT_KEY');
  }

  public async getBalances(address: Address, chainId: number): Promise<Covalent.Balance> {
    const transactionUrl = this.getBalanceUrl(address, chainId);
    try {
      this.logger.time(transactionUrl);
      const result = await this.httpService
        .get<Covalent.Response<Covalent.Balance>>(transactionUrl, {
          params: {
            key: this.apiKey,
            'quote-currency': CurrencyEnum.usd,
            'page-size': TRANSACTIONS_PER_PAGE,
          },
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(transactionUrl);

      if (result.error) {
        throw new HttpException(result.error_message, result.error_code);
      } else {
        return result.data;
      }
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`URL ${e.code || ' '}${e.config.url}`), 'getBalances');
        if (e.response?.data) {
          this.logger.error(e.response.data);
        }
        throw new HttpException(e.response, e.code);
      } else {
        this.logger.error('CovalentService.getTransactions', e);
        throw new HttpException(e.response, e.code);
      }
    }
  }

  public async getTransactions(address: Address, chainId: number): Promise<Covalent.Transaction> {
    const transactionUrl = this.getTransactionUrl(address, chainId);
    try {
      this.logger.time(transactionUrl);
      const result = await this.httpService
        .get<Covalent.Response<Covalent.Transaction>>(transactionUrl, {
          // baseURL: this.url, TODO: doesn't work properly, fix and use static get url method
          // url: transactionUrl,
          params: {
            key: this.apiKey,
            'quote-currency': CurrencyEnum.usd,
            'page-size': TRANSACTIONS_PER_PAGE,
          },
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(transactionUrl);

      if (result.error) {
        throw new HttpException(result.error_message, result.error_code);
      } else {
        return result.data;
      }
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(
          new Error(
            `URL ${e.code || ' '}this.logger.error(new Error(\`URL ${e.code || ' '}${e.config.url}`,
          ),
          'getTransactions',
        );
        if (e.response?.data) {
          this.logger.error(e.response.data);
        }
        throw new HttpException(e.response, e.code);
      } else {
        this.logger.error('CovalentService.getTransactions', e);
        throw e;
      }
    }
  }
}
