import { Exclude, plainToClass } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetsEntity } from '../../modules/assets/entities/assets.entity';
import { GetAssetResponseStatus } from '../enum/GetAssetResponseStatus.enum';
import { AssetDto } from './Asset.dto';

export class GetAssetsResponseDto {
  constructor(assets: AssetsEntity[]) {
    const success = Boolean(assets[0]);
    Object.assign(this, {
      status: success ? GetAssetResponseStatus.SUCCESS : GetAssetResponseStatus.NOT_FOUND,
      ...(success ? { assets: plainToClass(AssetDto, assets) } : {}),
    });
  }
  @ApiProperty({ enum: GetAssetResponseStatus, example: GetAssetResponseStatus.SUCCESS })
  status: GetAssetResponseStatus;

  @Exclude()
  @ApiProperty({ type: [AssetDto] })
  assets: AssetDto[];
}
