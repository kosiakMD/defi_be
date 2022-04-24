import sharp from 'sharp';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, ChainNameEnum } from '@app/common';
import { CrudService } from '@app/common/services/crud.service';

import { AwsService } from '../aws/aws.service';
import { IconSourceEntity } from './entities/IconSources.entity';
import { IconsFactory } from './icons.factory';

export interface IconConfig {
  address?: string;
  symbol?: string;
  chainId?: string | number;
}

@Injectable()
export class IconsService extends CrudService<IconSourceEntity> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(IconSourceEntity)
    private readonly iconSourceRepository: Repository<IconSourceEntity>,
    private readonly httpService: HttpService,
    private readonly awsService: AwsService,
  ) {
    super(iconSourceRepository);
  }

  public async getIconUrls(iconConfig: IconConfig): Promise<any[]> {
    this.logger.debug('Loading icons for ' + iconConfig.address);
    const iconSources = await this.getAll();
    const iconsUrl = [];
    for await (const iconSource of iconSources) {
      try {
        const icons = await IconsFactory.getInstance(iconSource, iconConfig, this.httpService);
        if (Array.isArray(icons)) {
          const uploadResult = icons.map((i: string) =>
            this.processAndUploadImage(i, iconConfig, iconSource.name),
          );

          iconsUrl.push(await Promise.all(uploadResult));
        } else {
          iconsUrl.push(await this.processAndUploadImage(icons, iconConfig, iconSource.name));
        }
      } catch (err) {
        this.logger.error(
          `Error to get icons on icon source ${iconSource.name}! Error: ${err.message}`,
        );
      }
    }
    return iconsUrl.flat();
  }

  private async processAndUploadImage(logoUrl, iconConfig, iconSourceName) {
    const chainName = ChainNameEnum[ChainIdEnum[iconConfig.chainId]];
    const input = await this.httpService
      .get(logoUrl, {
        responseType: 'arraybuffer',
      })
      .toPromise();

    let metadata;
    const image = await sharp(input.data);
    return image
      .metadata()
      .then((m) => {
        metadata = m;
        return image.webp().toBuffer();
      })
      .then(
        async (d) =>
          await this.awsService.uploadFile(
            'assets',
            'webp',
            `${chainName}/${iconConfig.address}/${iconConfig.address}-${iconSourceName}-${metadata.size}.webp`,
            d,
          ),
      );
  }
}
