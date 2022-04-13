import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherEtherscan implements IAbiFetcher {
  etherscanApiUrl: string;
  etherscanApiKey: string;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.etherscanApiUrl = this.configService.get('ETHERSCAN_API_URL');
    this.etherscanApiKey = this.configService.get('ETHERSCAN_API_KEY');
  }

  async fetchAbiAndAbiCode(address: string): Promise<ChainAbi> {
    try {
      this.logger.debug(`AbiFetcherEtherscan: fetchAbiAndAbiCode for address: [${address}]`);
      const abiCodeResponse = await firstValueFrom(
        this.httpService.get(
          `${this.etherscanApiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.etherscanApiKey}`,
        ),
      );
      return {
        chain: 'Ethereum',
        abi: abiCodeResponse.data.result[0].ABI,
        abiCode: abiCodeResponse.data.result[0].SourceCode,
      };
    } catch (e) {
      this.logger.error(`AbiFetcherEtherscan: fetchAbiAndAbiCode error - ${e}`);
      throw e;
    }
  }
}
