import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, ProtocolDataDto, RequestErrorHandler } from '@app/common';

@Injectable()
export class IntegrationService {
  private readonly protocolsUrl: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.protocolsUrl = new URL('/v1/protocols', config.get('services.integrations')).href;
  }

  @RequestErrorHandler()
  async getAllFeatures(): Promise<ProtocolDataDto[]> {
    const $data = this.http.get(this.protocolsUrl);
    const { data } = await firstValueFrom($data);
    return data.data;
  }
}
