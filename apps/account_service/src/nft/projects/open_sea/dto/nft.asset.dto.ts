import { Exclude, Expose, Type } from 'class-transformer';

import { TraitDto, BaseCollectionDto, ContractDto, OrderDto } from '.';

@Exclude()
export class NftAssetDto {
  @Expose({ name: 'token_id' })
  tokenId: string;

  @Expose()
  name: string;

  @Expose({ name: 'image_url' })
  imageUrl: string;

  @Expose({ name: 'asset_contract' })
  @Type(() => ContractDto)
  contract: ContractDto;

  @Expose()
  @Type(() => BaseCollectionDto)
  collection: BaseCollectionDto;

  @Expose()
  @Type(() => TraitDto)
  traits: TraitDto[];

  @Expose()
  @Type(() => OrderDto)
  orders: OrderDto[];
}
