import { firstValueFrom } from 'rxjs';
import sharp from 'sharp';
import { Stream } from 'stream';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ChainIdEnum } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';
import { CrudService } from '@app/common/services/crud.service';
import { getFulfilledPromises } from '@app/common/utils/promise';

import { AwsConfigService } from '../../config/aws/aws.config.service';
import { AwsService } from '../aws/aws.service';
import { IconSourceEntity } from './entities/icon-sources.entity';
import { CoingeckoStrategy } from './strategies/coingecko.strategy';
import { CoinmarketcapStrategy } from './strategies/coinmarketcap.strategy';
import { IconStrategy } from './strategies/icon-strategy';
import { TrustWalletStrategy } from './strategies/trust-wallet.strategy';
import { AssetIcon, AssetReference, SavedAssetIcon } from './types';

@Injectable()
export class IconsService extends CrudService<IconSourceEntity> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly httpService: HttpService,
    private readonly awsService: AwsService,
    private readonly awsConfigService: AwsConfigService,
    @InjectRepository(IconSourceEntity)
    private readonly iconSourceRepository: Repository<IconSourceEntity>,
  ) {
    super(iconSourceRepository);
  }

  public async loadAssetIcons(asset: AssetReference): Promise<SavedAssetIcon[]> {
    this.logger.debug(`Loading icons for ${asset.address}`);

    const assetIcons: SavedAssetIcon[] = [];
    for (const source of await this.getIconSources()) {
      const sourceAssetIcons = await this.loadAssetIconsFromSource(source, asset);
      assetIcons.push(...sourceAssetIcons);
    }

    this.logger.debug(`Loaded ${assetIcons.length} icons for ${asset.address}`);
    return assetIcons;
  }

  private async loadAssetIconsFromSource(source: IconSourceEntity, asset: AssetReference) {
    try {
      const strategy = this.createIconStrategy(source);
      if (!strategy) {
        this.logger.warn(`Icon load strategy ${source.name} is unknown`);
        return [];
      }

      const strategyIcons = await strategy.loadIcons(asset, source.config);
      this.logger.debug(`Loaded ${strategyIcons.length} icons from ${source.name} source`, asset);

      const uploadResult = strategyIcons.map((icon) =>
        this.processAndUploadImage(source.name, asset, icon),
      );

      const uploads = await getFulfilledPromises(uploadResult);
      this.logger.debug(`Uploaded ${strategyIcons.length} icons from ${source.name} source`, asset);

      return uploads;
    } catch (err) {
      this.logger.error(`Error to get icons on icon source ${source.name}! Error: ${err}`, asset);
    }
    return [];
  }

  private async processAndUploadImage(
    sourceName: string,
    { chainId, address }: AssetReference,
    { url, label }: AssetIcon,
  ) {
    try {
      const chainName = ChainAbbrEnum[ChainIdEnum[chainId]];
      const { data: responseStream } = await firstValueFrom(
        this.httpService.get<Stream>(url, {
          responseType: 'stream',
        }),
      );

      const webpStream = responseStream.pipe(sharp().webp());

      const sourceLowercase = sourceName.toLowerCase();
      return await this.awsService.uploadFile({
        bucket: this.awsConfigService.rootBucket,
        key: `${chainName}/${address}/${sourceLowercase}${label ? `-${label}` : ''}.webp`,
        contentType: 'image/webp',
        content: webpStream,
      });
    } catch (e) {
      this.logger.error(`Processing and upload asset logo failed ${url}. Error: ${e}`);
      throw e;
    }
  }

  private getIconSources() {
    return this.cache.getOrLoad('icon_sources', () => this.getAll({ where: { enabled: true } }));
  }

  private createIconStrategy(source: IconSourceEntity): IconStrategy {
    switch (source.name) {
      case 'COINGECKO':
        return new CoingeckoStrategy(this.logger, this.httpService);
      case 'COINMARKETCAP':
        return new CoinmarketcapStrategy(this.logger, this.config, this.httpService);
      case 'TRUST_WALLET':
        return new TrustWalletStrategy(this.logger);
      default:
        return null;
    }
  }
}
