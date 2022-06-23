import { V1Endpoints } from '@sdk/assets/constants/endpoints';
import { assemble } from '@sdk/assets/helpers/assemble';
import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetResponseInterface,
} from '@sdk/assets/interfaces';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId, Logger } from '@app/common';
import { join } from '@app/common/utils/urls';

// TODO: Move this one to library / sdk and reuse
export class AssetService {
  private readonly getAccountedAssetURL: string;
  private readonly getAssetsBulkURL: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    const make = (url: string) => join(configService.get<string>('ASSETS_SERVICE_URL'), url);

    this.getAccountedAssetURL = make(V1Endpoints.Accounted());
    this.getAssetsBulkURL = make(V1Endpoints.GetBulk());
  }

  async getAccountedAssets(chainId: ChainId): Promise<AssembledAssetInterface[]> {
    this.logger.log(`Get accounted asset for chain ${chainId}`);

    const { data } = await firstValueFrom(
      this.httpService.get<AssetResponseInterface>(this.getAccountedAssetURL, {
        params: { chainId },
      }),
    );

    // TODO: This is a hack for now, so that we may generate assembled assets (these are 1 level only)
    const requests = data.assets.map(({ chainId, address }) => ({ chainId, address }));
    return assemble({ assets: requests }, data);
  }

  async getAssets(requests: AssetRequestObjectInterface[]): Promise<AssembledAssetInterface[]> {
    this.logger.log(`Get (POST) asset details for ${requests.length} requested assets`);

    const { data } = await firstValueFrom(
      this.httpService.post(this.getAssetsBulkURL, {
        assets: requests,
      }),
    );

    return assemble({ assets: requests }, data);
  }
}
