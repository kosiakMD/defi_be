import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { TraitDto } from './trait.dto';

@Exclude()
export class NftAssetDto {
  @Expose()
  @ApiProperty({ example: '9119' })
  id: string = null;

  @Expose()
  @ApiProperty({ example: 'Super Shiba #9119' })
  name: string = null;

  @Expose()
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/rEbgZYOxhKbjLR6nOJwKsPQKCAEmjJxguTKCZ27vHbHm1v3a4NrwYnUq-nzaqq_zFjnC6PytLz5hQ3VC4HABPZ_KPzu478JvvzGFVBw',
  })
  imageUrl: string = null;

  @Expose()
  @ApiProperty({
    description: 'SVG element',
  })
  imageSvg: string = null;

  @Expose()
  @Type(() => TraitDto)
  @ApiProperty({ type: [TraitDto] })
  traits: TraitDto[] = null;

  @Expose()
  @ApiProperty({ type: Number, example: 0.05 })
  price: number = null;

  @Expose()
  @ApiProperty({ type: Number, example: 12 })
  priceUsd: number = null;
}
