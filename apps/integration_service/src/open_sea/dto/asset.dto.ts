import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetDto as BaseAssetDto } from '@app/common/dto/nft';

import { CollectionDto } from './collection.dto';
import { OrderDto } from './order.dto';

@Exclude()
export class AssetDto extends BaseAssetDto {
  @Expose()
  @Type(() => CollectionDto)
  @ApiProperty({ type: CollectionDto })
  collection: CollectionDto;

  @Expose()
  @Type(() => OrderDto)
  @ApiProperty({ type: [OrderDto], required: false })
  orders: OrderDto[];
}
