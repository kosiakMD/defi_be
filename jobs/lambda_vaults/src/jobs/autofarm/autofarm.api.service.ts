import { map } from 'rxjs/operators';

import { ChainIdEnum } from '@app/common';
import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

@Injectable()
export class AutofarmApiService {
  private autofarmApiUrl = new Map<ChainIdEnum, string>();
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    this.autofarmApiUrl.set(ChainIdEnum.avax, this.configService.get<string>('AUTOFARM_API_AVAX_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.bsc, this.configService.get<string>('AUTOFARM_API_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.celo, this.configService.get<string>('AUTOFARM_API_CELO_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.cro, this.configService.get<string>('AUTOFARM_API_CRO_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.ftm, this.configService.get<string>('AUTOFARM_API_FTM_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.harm, this.configService.get<string>('AUTOFARM_API_HARM_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.heco, this.configService.get<string>('AUTOFARM_API_HECO_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.mriver, this.configService.get<string>('AUTOFARM_API_MRIVER_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.okex, this.configService.get<string>('AUTOFARM_API_OKEX_URL'));
    this.autofarmApiUrl.set(ChainIdEnum.xdai, this.configService.get<string>('AUTOFARM_API_XDAI_URL'));
  }

  async getAutofarmPoolsData(chainId: ChainIdEnum) {
    try {
      const autofarmApiUrl = this.autofarmApiUrl.get(chainId);
      const response = await this.httpService
        .get(autofarmApiUrl)
        .pipe(map((response) => response.data))
        .toPromise();

      return response?.pools;
    } catch (e) {
      this.logger.error(e.message, 'getAutofarmPoolsData');
      throw e;
    }
  }
}
