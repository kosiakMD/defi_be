import { ApiProperty } from '@nestjs/swagger';

import { NetworkBaseDto } from '@app/common/dto/NetworkBase.dto';

export class NetworkResponseDto extends NetworkBaseDto {
  @ApiProperty({ type: String, example: 'safe/files/network/ethereum.png' })
  iconLink: string;

  @ApiProperty({ type: Number, example: 843 })
  scamCount: number;
}
