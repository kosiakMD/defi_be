import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NftCollectionDto } from '@app/common/dto/nft/nft.collection.dto';

import { TraitDto } from './trait.dto';

export class NftAssetDtoV1 {
  @ApiProperty({ example: '9119' })
  id: string = null;

  @ApiProperty({ example: 'Super Shiba #9119' })
  name: string = null;

  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/rEbgZYOxhKbjLR6nOJwKsPQKCAEmjJxguTKCZ27vHbHm1v3a4NrwYnUqNzaqq_zFjnC6PytLz5hQ3VC4HABPZ_KPzu478JvvzGFVBw',
  })
  imageUrl: string = null;

  @ApiProperty({
    description: 'SVG element',
  })
  imageSvg: string = null;

  @Type(() => TraitDto)
  @ApiProperty({ type: [TraitDto] })
  traits: TraitDto[] = null;

  @ApiProperty({ type: Number, example: 0.05 })
  price: number = null;

  @ApiProperty({ type: Number, example: 12 })
  priceUsd: number = null;

  @ApiProperty({ type: NftCollectionDto })
  collection: NftCollectionDto;
}
