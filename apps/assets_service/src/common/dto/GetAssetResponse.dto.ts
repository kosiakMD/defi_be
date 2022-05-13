import { Exclude, plainToClass } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetsGetBulkDto } from '../../modules/assets/dto/assets-get-bulk.dto';
import { AssetsEntity } from '../../modules/assets/entities/assets.entity';
import { GetAssetResponseStatus } from '../enum/GetAssetResponseStatus.enum';
import { AssetDto } from './Asset.dto';

export class GetAssetResponseDto {
  constructor(status: GetAssetResponseStatus, assetEntry: AssetsEntity | AssetsGetBulkDto) {
    const asset =
      status === GetAssetResponseStatus.UNKNOWN_ADDRESS
        ? assetEntry
        : plainToClass(AssetDto, assetEntry);
    Object.assign(this, { asset: plainToClass(AssetDto, asset), status });
  }
  @ApiProperty({ enum: GetAssetResponseStatus, example: GetAssetResponseStatus.SUCCESS })
  status: GetAssetResponseStatus;

  @Exclude()
  @ApiProperty({ type: AssetDto })
  asset: AssetsEntity | AssetsGetBulkDto;
}
