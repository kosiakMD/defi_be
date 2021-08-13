import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NetworkDto } from 'src/common/dto/network.dto';

@Exclude()
export class NetworkResponseDto extends NetworkDto {
  @Expose({ name: 'icon_link' })
  @ApiProperty({ type: String, example: 'safe/files/network/ethereum.png' })
  iconLink: string;

  @Expose()
  @ApiProperty({ type: Number, example: 843 })
  scamCount: number;
}
