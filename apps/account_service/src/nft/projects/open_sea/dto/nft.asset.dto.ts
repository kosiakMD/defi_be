import { Exclude, Expose, Type } from 'class-transformer';

import { TraitDto, CollectionDto, ContractDto, OrderDto, LastSaleDto } from '.';

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
  @Type(() => CollectionDto)
  collection: CollectionDto;

  @Expose()
  @Type(() => TraitDto)
  traits: TraitDto[];

  @Expose()
  @Type(() => OrderDto)
  orders: OrderDto[];

  @Expose({ name: 'last_sale' })
  @Type(() => LastSaleDto)
  lastSale: LastSaleDto;
}
