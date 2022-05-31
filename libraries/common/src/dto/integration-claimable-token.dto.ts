import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ClaimableDto } from './claimable.dto';
import { ERC20Token } from './erc20-token';

@Exclude()
export class IntegrationClaimableTokenDto extends ERC20Token {
  @ApiProperty({ type: ClaimableDto })
  @Expose()
  claimableData?: ClaimableDto = null;

  @ApiProperty({ type: String, example: 543.675 })
  @Expose()
  price?: number = null;
}
