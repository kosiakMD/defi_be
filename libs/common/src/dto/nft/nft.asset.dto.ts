import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { TraitDto } from './trait.dto';

@Exclude()
export class NftAssetDto {
  @Expose()
  @ApiProperty({ example: '9119' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Super Shiba #9119' })
  name: string;

  @Expose()
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/rEbgZYOxhKbjLR6nOJwKsPQKCAEmjJxguTKCZ27vHbHm1v3a4NrwYnUqNzaqq_zFjnC6PytLz5hQ3VC4HABPZ_KPzu478JvvzGFVBw',
  })
  imageUrl: string;

  @Expose()
  @ApiProperty({
    description: 'SVG element',
  })
  imageSVG: string;

  @Expose()
  @Type(() => TraitDto)
  @ApiProperty({ type: [TraitDto] })
  traits: TraitDto[];

  @Expose()
  @ApiProperty({ name: 'priceUSD', example: '1200' })
  priceUSD: string;
}
