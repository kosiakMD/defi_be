import { Exclude, Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AssetUnderlyingDto {
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ type: () => String })
  address: string;

  @Expose()
  @ApiProperty({ type: String })
  position: number;

  @Expose()
  @ApiProperty({ type: String })
  @IsOptional()
  reserve?: string;
}
