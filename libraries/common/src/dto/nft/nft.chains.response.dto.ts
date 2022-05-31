import { ApiProperty } from '@nestjs/swagger';

export class NftChainsResponseDto {
  @ApiProperty({ type: Number, example: [1, 2, 3], isArray: true })
  chainIds: number[] = null;
}
