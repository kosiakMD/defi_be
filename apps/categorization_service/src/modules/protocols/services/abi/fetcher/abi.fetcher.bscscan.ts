import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherBscscan implements IAbiFetcher {
  readonly name = this.constructor.name;
  readonly retryInterval = 3000; //3 seconds
  readonly maxRetries = 3;

  bscscanApiUrl: string;
  bscscanApiKey: string;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.bscscanApiUrl = this.configService.get('BSCSCAN_API_URL');
    this.bscscanApiKey = this.configService.get('BSCSCAN_API_KEY');
  }

  async fetchAbiAndAbiCode(address: string, retries = 0): Promise<ChainAbi> {
    try {
      this.logger.debug(`AbiFetcherBscscan: fetchAbiAndAbiCode for address: [${address}]`);
      const abiCodeResponse = await firstValueFrom(
        this.httpService.get(
          `${this.bscscanApiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.bscscanApiKey}`,
        ),
      );
      if (this.rateLimitError(abiCodeResponse)) {
        if (retries < this.maxRetries) {
          await delay(this.retryInterval);
          this.logger.debug(`retrying: address=[${address}]`);
          return this.fetchAbiAndAbiCode(address, retries + 1);
        }
        this.logger.warn(`too many attempts (${retries}), giving up`, this.name);
      }
      return {
        chain: 'binance',
        abi: abiCodeResponse.data.result[0].ABI,
        abiCode: abiCodeResponse.data.result[0].SourceCode,
        proxy: abiCodeResponse.data.result[0].Proxy === '1',
        implementation: abiCodeResponse.data.result[0].Implementation,
      };
    } catch (e) {
      this.logger.error(`AbiFetcherBscscan: fetchAbiAndAbiCode error - ${e}`);
      throw e;
    }
  }

  private rateLimitError(response: { data: { status: string; result: string } }): boolean {
    return response.data.status === '0' && response.data.result.indexOf('Max rate limit') >= 0;
  }
}
