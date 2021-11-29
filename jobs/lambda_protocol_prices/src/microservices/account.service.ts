import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, IAssetResponseDto, Logger, RequestErrorHandler } from '@app/common';

@Injectable()
export class AccountService {
  private readonly assetsUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
    const assetsPath = 'v1/assets';

    this.assetsUrl = new URL(assetsPath, host).href;
  }

  @RequestErrorHandler()
  async getAssets(addresses: Address[], chain: ChainIdEnum): Promise<IAssetResponseDto[]> {
    const timeKey = `GET: ${this.assetsUrl} - Chain: ${chain}`;
    this.logger.time(timeKey);
    const data = await this.httpService
      .get(this.assetsUrl, { params: { addresses, chains: [chain] } })
      .pipe(map((r) => r.data.data))
      .toPromise();
    this.logger.timeEnd(timeKey);
    return data;
  }

  @RequestErrorHandler()
  async saveTrackingAsset(address: string, chain: ChainIdEnum): Promise<IAssetResponseDto> {
    const timeKey = `POST: ${this.assetsUrl} - Chain: ${chain}`;
    this.logger.time(timeKey);
    const data = await this.httpService
      .post(this.assetsUrl, {
        address: address,
        chain: chain,
      })
      .pipe(map((r) => r.data))
      .toPromise();
    this.logger.timeEnd(timeKey);
    return data;
  }
}
