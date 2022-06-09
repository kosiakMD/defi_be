import { V1Endpoints } from '@sdk/assets/constants/endpoints';
import { assemble } from '@sdk/assets/helpers/assemble';
import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetServiceInterface,
} from '@sdk/assets/interfaces';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { join } from '@app/common/utils/urls';

import { logExecutionTime } from './utils';

export class AssetService implements AssetServiceInterface {
  /** Endpoint URLS */
  private getAssetURL: string;
  private getAssetsBulkURL: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
  ) {
    const make = (url: string) => join(configService.get<string>('ASSETS_SERVICE_URL'), url);

    this.getAssetURL = make(V1Endpoints.Assets());
    this.getAssetsBulkURL = make(V1Endpoints.GetBulk());
  }

  async getAsset(address: string, chainId: number): Promise<AssembledAssetInterface> {
    // TODO: This uses the bulk asset endpoint
    const [[, asset]] = await this.getAssets([{ address, chainId }]);
    return asset;
  }

  async getAssets(
    requests: AssetRequestObjectInterface[],
  ): Promise<[string, AssembledAssetInterface][]> {
    const { data } = await logExecutionTime(
      this.logger,
      `Get (POST) asset details for ${requests.length} requested assets`,
      () =>
        firstValueFrom(
          this.httpService.post('http://assets-service:3005/v1/assets/get-bulk', {
            assets: requests,
          }),
        ),
    );

    const assets = assemble({ assets: requests }, data);
    return assets.map((a) => [a.address, a]);
  }
}
