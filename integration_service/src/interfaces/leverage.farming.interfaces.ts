import { ApiProperty } from '@nestjs/swagger';

import { ProtocolTypeEnum } from '../common/enum';

import { LPToken } from '../integrations/integrations.dto';
import { BaseData, ERC20Token, LeverageErcToken } from './transactions.interfaces';

export class BorrowToken extends ERC20Token {
  @ApiProperty()
  price: number;

  @ApiProperty()
  balance: string;

  @ApiProperty()
  value: number;
}

export interface LeverageFarmingPosition {
  address: string;
  borrowToken?: BorrowToken;
  earned?: number;
  debtRatio?: number;
  farmToken?: LPToken | LeverageErcToken;
}

export interface LeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  leverageFarmingPositions: LeverageFarmingPosition[];
}
