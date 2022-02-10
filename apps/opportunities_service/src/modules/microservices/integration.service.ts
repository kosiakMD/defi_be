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
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.protocolsUrl = new URL(
      '/v1/protocols',
      this.configService.get('INTEGRATION_SERVICE_URL'),
    ).href;
  }

  @RequestErrorHandler()
  async getAllFeatures(): Promise<ProtocolDataDto[]> {
    this.logger.time(this.protocolsUrl);
    const $data = this.http.get(this.protocolsUrl);
    const { data } = await firstValueFrom($data);
    this.logger.timeEnd(this.protocolsUrl);
    return data.data;
  }
}
