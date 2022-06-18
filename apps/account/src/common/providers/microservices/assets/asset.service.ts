import { V1Endpoints } from '@sdk/assets/constants/endpoints';
import { AssetResponseInterface, AssetResponseObjectInterface } from '@sdk/assets/interfaces';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId, Logger } from '@app/common';
import { join } from '@app/common/utils/urls';

// TODO: Move this one to library
export class AssetService {
  private readonly getAccountedAssetURL: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    const make = (url: string) => join(configService.get<string>('ASSETS_SERVICE_URL'), url);

    this.getAccountedAssetURL = make(V1Endpoints.Accounted());
  }

  async getAccountedAssets(chainId: ChainId): Promise<AssetResponseObjectInterface[]> {
    this.logger.log(`Get accounted asset for chain ${chainId}`);

    const { data } = await firstValueFrom(
      this.httpService.get<AssetResponseInterface>(this.getAccountedAssetURL, {
        params: { chainId },
      }),
    );

    return data.assets;
  }
}
