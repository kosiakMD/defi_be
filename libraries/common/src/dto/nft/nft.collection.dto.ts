import { Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NftCollectionBaseDto } from '@app/common/dto/nft/nft.collection.base.dto';

import { LinksDto } from '.';
import { CollectionStatsDto } from './collection.stats.dto';
import { UsernamesDto } from './usernames.dto';

export class NftCollectionDto extends NftCollectionBaseDto {
  @Type(() => LinksDto)
  @ApiProperty({ type: () => LinksDto })
  links: LinksDto = null;

  @Type(() => UsernamesDto)
  @ApiProperty({ type: () => UsernamesDto })
  usernames: UsernamesDto = null;

  @ApiProperty({ example: 'ERC1155' })
  tokenStandard: string = null;

  @Type(() => CollectionStatsDto)
  @ApiProperty({ type: () => CollectionStatsDto })
  stats?: CollectionStatsDto = null;

  @Expose()
  @ApiProperty({ example: 2, required: false })
  balance?: number = null;

  @ApiProperty({ example: 0.05, required: false })
  totalCollectionPrice?: number = null;

  @ApiProperty({ example: 1750, required: false })
  totalCollectionPriceUsd?: number = null;
}
