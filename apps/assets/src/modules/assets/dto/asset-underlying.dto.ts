import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AssetUnderlyingDto {
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ type: () => String })
  address: string;

  @Expose()
  @ApiProperty({ type: String })
  position: number;
}
