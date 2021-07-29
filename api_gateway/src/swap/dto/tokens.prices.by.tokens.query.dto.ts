import { ApiProperty } from '@nestjs/swagger';

export class TokensPricesByTokensQueryDto {
  @ApiProperty({ type: String, example: '0x0d4981d1bb50198aab31d6ca878a9d50023b2cf9' })
  sellToken: string;

  @ApiProperty({ type: String, example: '0xdac17f958d2ee523a2206206994597c13d831ec7' })
  buyToken: string;

  @ApiProperty({ type: String, example: '150' })
  sellAmount: string;
}
