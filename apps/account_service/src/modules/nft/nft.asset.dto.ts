import { Exclude, Expose, Type } from 'class-transformer';

import { CollectionDto, ContractDto, LastSaleDto, OrderDto, TraitDto } from '../../common/dto';

@Exclude()
export class NftAssetDto {
  @Expose({ name: 'token_id' })
  tokenId: string = null;

  @Expose()
  name: string = null;

  @Expose({ name: 'image_url' })
  imageUrl: string = null;

  @Expose({ name: 'asset_contract' })
  @Type(() => ContractDto)
  contract: ContractDto = null;

  @Expose()
  @Type(() => CollectionDto)
  collection: CollectionDto = null;

  @Expose()
  permalink: string = null;

  @Expose()
  @Type(() => TraitDto)
  traits: TraitDto[] = [];

  @Expose()
  @Type(() => OrderDto)
  orders: OrderDto[] = [];

  @Expose({ name: 'last_sale' })
  @Type(() => LastSaleDto)
  lastSale: LastSaleDto = null;
}
