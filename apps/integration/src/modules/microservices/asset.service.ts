import { V1Endpoints } from '@sdk/assets/constants/endpoints';
import { assemble } from '@sdk/assets/helpers/assemble';
import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetServiceInterface,
} from '@sdk/assets/interfaces';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { logExecutionTime } from '@app/common/utils';
import { join } from '@app/common/utils/urls';

export class AssetService implements AssetServiceInterface {
  /** Endpoint URLS */
  private readonly getAssetURL: string;
  private readonly getAssetsBulkURL: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
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
          this.httpService.post(this.getAssetsBulkURL, {
            assets: requests,
          }),
        ),
    );
    const assets = assemble({ assets: requests }, data);
    return assets.map((a) => [a.address, a]);
  }
}
