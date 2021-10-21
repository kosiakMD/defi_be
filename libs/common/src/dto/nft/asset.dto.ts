import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { CollectionDto } from './collection.dto';
import { ContractDto } from './contract.dto';
import { LastSaleDto } from './last.sale.dto';
import { OwnerDto } from './owner.dto';
import { TraitDto } from './trait.dto';

@Exclude()
export class AssetDto {
  @Expose()
  @ApiProperty({ example: 65496353 })
  id: number;

  @Expose({ name: 'token_id' })
  @ApiProperty({ example: '9119' })
  tokenId: string;

  @Expose()
  @ApiProperty({ example: 'Super Shiba #9119' })
  name: string;

  @Expose()
  @ApiProperty({
    example:
      'From Mercury to Planet Nine, we, Super Shibas, never stopped exploring... till we found our current home, Earth. The Earth is a playground for us. Everyday is an adventure here. We discover new places, savor the many',
  })
  description: string;

  @Expose({ name: 'image_url' })
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/rEbgZYOxhKbjLR6nOJwKsPQKCAEmjJxguTKCZ27vHbHm1v3a4NrwYnUqNzaqq_zFjnC6PytLz5hQ3VC4HABPZ_KPzu478JvvzGFVBw',
  })
  imageUrl: string;

  @Expose({ name: 'token_metadata' })
  @ApiProperty({ example: 'http://api.supershibas.io/metadata/9119' })
  tokenMetadata: string;

  @Expose({ name: 'asset_contract' })
  @ApiProperty({ type: ContractDto })
  @Type(() => ContractDto)
  contract: ContractDto;

  @Expose()
  @Type(() => CollectionDto)
  @ApiProperty({ type: CollectionDto })
  collection: CollectionDto;

  @Expose()
  @Type(() => TraitDto)
  @ApiProperty({ type: [TraitDto] })
  traits: TraitDto[];

  @Expose()
  @Type(() => OwnerDto)
  @ApiProperty({ type: OwnerDto })
  owner: OwnerDto;

  @Expose()
  @Type(() => OwnerDto)
  @ApiProperty({ type: OwnerDto })
  creator: OwnerDto;

  @Expose({ name: 'last_sale' })
  @Type(() => LastSaleDto)
  @ApiProperty({ type: LastSaleDto })
  lastSale: LastSaleDto;

  @Expose()
  @ApiProperty({ name: 'priceUSD', example: 560.9992 })
  priceUSD: number;
}
