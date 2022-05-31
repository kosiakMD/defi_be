import { ApiProperty } from '@nestjs/swagger';

import { ERC20TokenDto } from './ERC20Token.dto';

export class ClaimAbleTokenDto extends ERC20TokenDto {
  @ApiProperty({ type: String, example: '78945' })
  claimable: string;

  @ApiProperty({ type: String, example: '89645', required: false })
  claimed?: string;

  @ApiProperty({ type: Number, example: 0.154, required: false })
  priceUSD?: number;
}
