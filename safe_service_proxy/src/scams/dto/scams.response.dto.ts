import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ScamDto } from './scam.dto';

@Exclude()
export class ScamsResponseDto {
  @Expose()
  @Transform(({ obj }) => plainToClass(ScamDto, obj.items))
  @ApiProperty({ type: [ScamDto] })
  scams: ScamDto[];

  @Expose()
  @ApiProperty({ type: Number, example: 1 })
  currentPage: number;

  @Expose()
  @ApiProperty({ type: Number, example: 248 })
  lastPage: number;

  @Expose()
  @ApiProperty({ type: Number, example: 2474 })
  count: number;
}
