import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '../config/enum';
import { Logger } from '../logger/logger.service';
import { RequestErrorHandler } from '../utils/decorators/error.decorator';
import { LiquidityPoolTokenDto } from './dto/account/account.dto';

@Injectable()
export class AccountService {
  private readonly saveTrackedTokenUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('ACCOUNT_SERVICE_URL').replace(/\/$/, '');
    const saveTrackedTokenPath = 'v1/assets';

    this.saveTrackedTokenUrl = `${url}/${saveTrackedTokenPath}`;
  }

  @RequestErrorHandler()
  async saveTrackingAsset(address: string, chain: ChainIdEnum): Promise<LiquidityPoolTokenDto> {
    return await this.httpService
      .post(this.saveTrackedTokenUrl, {
        address: address,
        chain: chain,
      })
      .pipe(map((r) => r.data))
      .toPromise();
  }
}
