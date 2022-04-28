import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId } from '@app/common';

import { NotifyPayloadFeaturesDto, ProtocolsResponseData } from '../jobs/integrations.dto';
import { Logger } from '../logger/logger.service';
import { RequestErrorHandler } from '../utils/decorators/error.decorator';

@Injectable()
export class IntegrationService {
  private readonly getProtocolsUrl: string;
  private readonly notifyLiquidityPoolsUrl: string;
  private readonly getV3ProtocolsPath: string;
  private readonly syncV3OpportunitiesUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('INTEGRATION_SERVICE_URL').replace(/\/$/, '');
    const getProtocolsPath = 'v1/protocols';
    const notifyLiquidityPoolsPath = 'v1/jobs';
    const getV3ProtocolsPath = 'v3/protocols';
    const syncV3OpportunitiesUrl = 'v3/protocols/sync';

    this.getProtocolsUrl = `${url}/${getProtocolsPath}`;
    this.notifyLiquidityPoolsUrl = `${url}/${notifyLiquidityPoolsPath}`;
    this.getV3ProtocolsPath = `${url}/${getV3ProtocolsPath}`;
    this.syncV3OpportunitiesUrl = `${url}/${syncV3OpportunitiesUrl}`;
  }

  @RequestErrorHandler()
  async getProtocols(): Promise<ProtocolsResponseData> {
    return await this.httpService
      .get(this.getProtocolsUrl)
      .pipe(map((r) => r.data))
      .toPromise();
  }

  @RequestErrorHandler()
  async getV3Protocols(): Promise<ProtocolsResponseData> {
    return await this.httpService
      .get(this.getV3ProtocolsPath)
      .pipe(map((r) => r.data))
      .toPromise();
  }

  @RequestErrorHandler()
  async syncV3ProtocolData(protocolName: string, chains: ChainId[]): Promise<any> {
    return await this.httpService
      .get(
        this.getV3ProtocolsPath +
          '/' +
          protocolName +
          '/' +
          'sync' +
          '?' +
          'chains=' +
          chains.join(','),
      )
      .pipe(map((r) => r.data))
      .toPromise();
  }

  @RequestErrorHandler()
  async notifyWithLiquidityPoolsData(payload: NotifyPayloadFeaturesDto[]): Promise<any> {
    return await this.httpService
      .post(this.notifyLiquidityPoolsUrl, payload)
      .pipe(map((r) => r.data))
      .toPromise();
  }

  @RequestErrorHandler()
  async syncV3Opportunities(): Promise<any> {
    return await this.httpService
      .get(this.syncV3OpportunitiesUrl)
      .pipe(map((r) => r.data))
      .toPromise();
  }
}
