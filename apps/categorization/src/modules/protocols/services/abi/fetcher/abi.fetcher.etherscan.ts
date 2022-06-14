import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherEtherscan implements IAbiFetcher {
  readonly name = this.constructor.name;
  etherscanApiUrl: string;
  etherscanApiKey: string;
  readonly retryInterval = 3000; //3 seconds
  readonly maxRetries = 3;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.etherscanApiUrl = this.configService.get('ETHERSCAN_API_URL');
    this.etherscanApiKey = this.configService.get('ETHERSCAN_API_KEY');
  }

  async fetchAbiAndAbiCode(address: string, retries = 0): Promise<ChainAbi> {
    this.logger.debug(`AbiFetcherEtherscan: fetchAbiAndAbiCode for address: [${address}]`);
    const abiCodeResponse = await firstValueFrom(
      this.httpService.get(
        `${this.etherscanApiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.etherscanApiKey}`,
      ),
    );
    if (this.rateLimitError(abiCodeResponse)) {
      if (retries < this.maxRetries) {
        await delay(this.retryInterval);
        this.logger.debug(`retrying: address=[${address}]`);
        return this.fetchAbiAndAbiCode(address, retries + 1);
      }
      throw Error(`too many attempts (${retries}), giving up`);
    }
    if (abiCodeResponse.data.result[0].ABI === 'Contract source code not verified') {
      throw Error(`Contract source code not verified: ${address}`);
    }
    return {
      chain: 'Ethereum',
      abi: abiCodeResponse.data.result[0].ABI,
      abiCode: abiCodeResponse.data.result[0].SourceCode,
    };
  }

  private rateLimitError(response: { data: { status: string; result: string } }): boolean {
    return response.data.status === '0' && response.data.result.indexOf('Max rate limit') >= 0;
  }
}
