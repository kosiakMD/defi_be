import { firstValueFrom } from 'rxjs';
import sharp from 'sharp';
import { Stream } from 'stream';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ChainIdEnum } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';

import { AssetReference } from '../../../common/types';

import { AwsService } from '../../../aws/aws.service';
import { AwsConfigService } from '../../../config/aws/aws.config.service';
import { SavedAssetIcon } from '../types';
import { AssetIcon } from './analysers/core/asset.analyser';

@Injectable()
export class IconsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly httpService: HttpService,
    private readonly awsService: AwsService,
    private readonly awsConfigService: AwsConfigService,
  ) {}

  public async uploadAssetIcons(
    asset: AssetReference,
    icons: AssetIcon[],
  ): Promise<SavedAssetIcon[]> {
    this.logger.debug(`Loading icons for ${asset.address}`);

    const promises = icons.map((icon) => this.processAndUploadImage(asset, icon));
    const assetIcons = await Promise.all(promises);
    const uploadedIcons = assetIcons.filter((icon) => !!icon);

    this.logger.debug(`Loaded ${uploadedIcons.length} icons for ${asset.address}`);
    return uploadedIcons;
  }

  private async processAndUploadImage(
    { chainId, address }: AssetReference,
    { url, label, source }: AssetIcon,
  ) {
    try {
      const chainName = ChainAbbrEnum[ChainIdEnum[chainId]];
      const { data: responseStream } = await firstValueFrom(
        this.httpService.get<Stream>(url, {
          responseType: 'stream',
        }),
      );

      const webpStream = responseStream.pipe(sharp().webp());

      const sourceLowercase = source.toLowerCase();
      return await this.awsService.uploadFile({
        bucket: this.awsConfigService.rootBucket,
        key: `${chainName}/${address}/${sourceLowercase}${label ? `-${label}` : ''}.webp`,
        contentType: 'image/webp',
        content: webpStream,
      });
    } catch (e) {
      this.logger.error(`Processing and upload asset logo failed ${url}. Error: ${e}`);
    }
  }
}
