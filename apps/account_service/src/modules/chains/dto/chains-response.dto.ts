import { ApiProperty } from '@nestjs/swagger';

export class ChainsResponseDto {
  @ApiProperty()
  chain: any;
}
