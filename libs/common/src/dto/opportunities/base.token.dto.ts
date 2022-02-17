import { ApiProperty } from '@nestjs/swagger';

export class BaseTokenDto {
  @ApiProperty({ type: String, example: 'Ethereum' })
  name: string;
  @ApiProperty({ type: String, example: 'ETH' })
  symbol: string;
  @ApiProperty({ type: [BaseTokenDto] })
  tokens?: BaseTokenDto[]; // underlying tokens
}
