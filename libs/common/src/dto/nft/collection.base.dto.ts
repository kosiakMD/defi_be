import { Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address, ChainIdEnum, NftProjectEnum } from '@app/common';

import { LinksDto } from '.';

export class CollectionBaseDto {
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
  @Type(() => LinksDto)
  @ApiProperty({ type: () => LinksDto })
  links: LinksDto;

  @Expose()
  @ApiProperty({ enum: ChainIdEnum })
  chain: ChainIdEnum;

  @Expose()
  slug: string;

  @Expose()
  @ApiProperty({ example: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39', required: false })
  address?: Address;

  @Expose()
  @ApiProperty({ example: 2, required: false })
  balance?: number;

  @Expose()
  @ApiProperty({ example: 0.05, required: false })
  totalCollectionPrice?: number;

  @Expose()
  @ApiProperty({ example: 1750, required: false })
  totalCollectionPriceUsd?: number;

  @Expose()
  @ApiProperty({ example: NftProjectEnum.aavegotchi, required: false })
  project?: NftProjectEnum;
}
