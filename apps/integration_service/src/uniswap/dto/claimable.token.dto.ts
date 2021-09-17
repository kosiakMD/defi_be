import { ApiProperty } from '@nestjs/swagger';

import { ClaimAbleToken } from '../../interfaces/transactions.interfaces';
import { ERC20TokenDto } from './erc20.token.dto';

export class ClaimAbleTokenDto extends ERC20TokenDto implements ClaimAbleToken {
  @ApiProperty({ type: String, example: '78945' })
  claimable: string;

  @ApiProperty({ type: String, example: '89645', required: false })
  claimed?: string;

  @ApiProperty({ type: Number, example: 0.154, required: false })
  priceUSD?: number;
}
