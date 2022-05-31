import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address, ChainIdEnum, NftProjectEnum } from '@app/common';

import { LinksDto } from '.';
import { CollectionDisplayDataDto } from './collection.display.data.dto';
import { CollectionStatsDto } from './collection.stats.dto';
import { UsernamesDto } from './usernames.dto';

@Exclude()
export class CollectionBaseDto {
  @Expose()
  @ApiProperty({ example: 'Super Shiba Club' })
  name: string = null;

  @Expose()
  @ApiProperty({ example: 'TES' })
  symbol: string = null;

  @Expose()
  @ApiProperty({
    example:
      'The Access Utility Token can be used to gain exclusive entry to premium giveaways, claimable metaverse avatar, and access to exclusive merch.',
  })
  description: string = null;

  @Expose()
  @Type(() => LinksDto)
  @ApiProperty({ type: () => LinksDto })
  links: LinksDto = null;

  @Expose()
  @Type(() => UsernamesDto)
  @ApiProperty({ type: () => UsernamesDto })
  usernames: UsernamesDto = null;

  @Expose()
  @Type(() => CollectionDisplayDataDto)
  @ApiProperty({ type: () => CollectionDisplayDataDto })
  displayData: CollectionDisplayDataDto = null;

  @Expose()
  @ApiProperty({ example: 'ERC1155' })
  tokenStandard: string = null;

  @Expose()
  @ApiProperty({ enum: ChainIdEnum })
  chain: ChainIdEnum = null;

  @Expose()
  @ApiProperty({ type: String })
  slug: string = null;

  @Expose()
  @Type(() => CollectionStatsDto)
  @ApiProperty({ type: () => CollectionStatsDto })
  stats?: CollectionStatsDto = null;

  @Expose()
  @ApiProperty({ example: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39', required: false })
  address?: Address = null;

  @Expose()
  @ApiProperty({ example: 2, required: false })
  balance?: number = null;

  @Expose()
  @ApiProperty({ example: 0.05, required: false })
  totalCollectionPrice?: number = null;

  @Expose()
  @ApiProperty({ example: 1750, required: false })
  totalCollectionPriceUsd?: number = null;

  @Expose()
  @ApiProperty({ example: NftProjectEnum.aavegotchi, required: false })
  project?: NftProjectEnum = null;
}
