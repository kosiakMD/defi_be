import { Cache } from 'cache-manager';
import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId, ChainIdEnum, Logger } from '@app/common';
import { join } from '@app/common/utils/urls';

import { logExecutionTime } from './utils';

@Injectable()
export class RpcService {
  /** Endpoint URLS */
  private getRpcCallUrl: (chainId: ChainId) => string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
  ) {
    const make = (url: string) => join(configService.get<string>('RPC_SERVICE_URL'), url);

    this.getRpcCallUrl = (chainId) => make(`/v1/rpc-call/${chainId}`);
  }

  async makeRpcCall<T = any>(chainId: ChainIdEnum, request: any): Promise<T> {
    return logExecutionTime(this.logger, `RPC call on the chain '${chainId}'`, () =>
      firstValueFrom(
        this.httpService.post(this.getRpcCallUrl(chainId), request).pipe(map(({ data }) => data)),
      ),
    );
  }
}
