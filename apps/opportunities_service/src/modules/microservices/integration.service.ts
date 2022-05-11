import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainIdEnum,
  Logger,
  ProtocolDataDto,
  ProtocolV3DataDto,
  RequestErrorHandler,
} from '@app/common';

@Injectable()
export class IntegrationService {
  private readonly protocolsV1Url: string;
  private readonly protocolsV3Url: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.protocolsV1Url = new URL('/v1/protocols', config.get('services.integrations')).href; // returns v2 protocols
    this.protocolsV3Url = new URL('/v3/protocols', config.get('services.integrations')).href;
  }

  /**
   * Note Function name is V2 since it returns v2 protocols, however
   * api is v1 for reasons
   *
   * @returns Protocol List
   */
  @RequestErrorHandler()
  async getV2ProtocolList(): Promise<ProtocolDataDto[]> {
    const $data = this.http.get(this.protocolsV1Url);
    const { data } = await firstValueFrom($data);
    return data.data;
  }

  @RequestErrorHandler()
  async getV3ProtocolList(): Promise<ProtocolV3DataDto[]> {
    const $data = this.http.get(this.protocolsV3Url);
    const { data } = await firstValueFrom($data);
    return data.data;
  }

  @RequestErrorHandler()
  // TODO: this should be <IOpportunityResponse> from integration_service. How do we want to handle shared interfaces
  async getV3ProtocolOpportunities(projectName: string, chains: ChainIdEnum[]): Promise<any> {
    const $data = this.http.get(
      `${this.protocolsV3Url}/${projectName}/opportunities?chains=${chains.join(',')}`,
    );
    const { data } = await firstValueFrom($data);
    return data.data;
  }
}
