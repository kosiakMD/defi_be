import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, CurrencyIdEnum, Logger } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';
import { logExecutionTime } from '@app/common/utils';

import { CurrentPricesPayload, PriceResponseDto } from '../../common/dto';

import { PriceServiceInterface } from './price.service.interface';

@Injectable()
export class PriceService implements PriceServiceInterface {
  private readonly getPricesUrl: string;
  private readonly getPriceUrlFetch: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const url = this.configService.get<string>('PRICE_SERVICE_URL').replace(/\/$/, '');
    this.getPricesUrl = `${url}/v1/prices`;
    this.getPriceUrlFetch = `${url}/v1/prices/fetch`;
  }

  /**
   * @deprecated Use getTokenPricesFetch
   * **/
  async getTokenPrices(
    addressesArray: Address[],
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const addresses = addressesArray.join(',');
    const { data } = await logExecutionTime(
      this.logger,
      `Get Prices for ${addressesArray.length} addressed`,
      () =>
        firstValueFrom(
          this.httpService.post<PriceResponseDto<CurrentPricesPayload>>(this.getPricesUrl, {
            chain,
            addresses,
          }),
        ),
    );

    return data;
  }

  async getTokenPricesFetch(
    addressesArray: Address[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const addresses = addressesArray.join(',');
    const { data } = await logExecutionTime(
      this.logger,
      `Fetch Prices for ${addressesArray.length} addressed`,
      () =>
        firstValueFrom(
          this.httpService.post<PriceResponseDto<CurrentPricesPayload>>(this.getPriceUrlFetch, {
            chain: chainId,
            addresses,
            currency: CurrencyIdEnum.usd,
          }),
        ),
    );

    return data;
  }
}
