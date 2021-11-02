import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';

import { NftAssetDto, LinksDto } from '.';

@Exclude()
export class CollectionDto {
  @Expose()
  @ApiProperty({ example: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39' })
  address: Address;

  @Expose()
  @Type(() => NftAssetDto)
  @ApiProperty({ type: () => [NftAssetDto] })
  assets: NftAssetDto[];

  @Expose()
  @ApiProperty({ example: 'Super Shiba Club' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'TES' })
  symbol: string;

  @Expose()
  @ApiProperty({
    example:
      'The Access Utility Token can be used to gain exclusive entry to premium giveaways, claimable metaverse avatar, and access to exclusive merch.',
  })
  description: string;

  @Expose()
  @ApiProperty({ example: 0.05 })
  averagePrice: number;

  @Expose()
  @ApiProperty({ example: 1750 })
  averagePriceUSD: number;

  @Expose()
  @ApiProperty({ example: 2 })
  balance: number;

  @Expose()
  @Type(() => LinksDto)
  @ApiProperty({ type: () => LinksDto })
  links: LinksDto;
}
