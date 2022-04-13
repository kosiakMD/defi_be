import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherBscscan implements IAbiFetcher {
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

  async fetchAbiAndAbiCode(address: string): Promise<ChainAbi> {
    try {
      this.logger.debug(`AbiFetcherBscscan: fetchAbiAndAbiCode for address: [${address}]`);
      const abiCodeResponse = await firstValueFrom(
        this.httpService.get(
          `${this.bscscanApiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.bscscanApiKey}`,
        ),
      );
      return {
        chain: 'BSC',
        abi: abiCodeResponse.data.result[0].ABI,
        abiCode: abiCodeResponse.data.result[0].SourceCode,
      };
    } catch (e) {
      this.logger.error(`AbiFetcherBscscan: fetchAbiAndAbiCode error - ${e}`);
      throw e;
    }
  }
}
