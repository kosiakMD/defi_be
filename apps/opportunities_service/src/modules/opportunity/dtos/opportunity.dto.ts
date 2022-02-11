import { ApiProperty } from '@nestjs/swagger';

import { BaseEntityDto } from './base.entity.dto';
import { FarmDto } from './farm.dto';
import { InvestmentTokensDto } from './investment.tokens.dto';

export class OpportunityDto extends BaseEntityDto {
  @ApiProperty({ type: FarmDto })
  farm: FarmDto;

  @ApiProperty({ type: Number, example: 10 })
  chainId: number;

  @ApiProperty({ type: Number, example: 0.0251 })
  apr: number;

  @ApiProperty({ type: Number, example: 3.516 })
  apy: number;

  @ApiProperty({
    type: String,
    example: 'https://curve.fi/factory/1',
  })
  investmentUrl: string;

  @ApiProperty({ type: Number, example: 1258237.18275 })
  totalValueLocked: number;

  @ApiProperty({ type: InvestmentTokensDto })
  tokens: InvestmentTokensDto;
}
