import { ApiProperty } from '@nestjs/swagger';

export class ChainResponseDto {
  @ApiProperty()
  chain: any;
}
