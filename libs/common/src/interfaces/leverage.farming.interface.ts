import {
  BaseData,
  LeverageBorrowingTokenDto,
  LeverageErcToken,
  LPToken,
  ProtocolTypeEnum,
} from '@app/common';

export interface LeverageFarmingPosition {
  address: string;
  borrowToken?: LeverageBorrowingTokenDto;
  earned?: number;
  debtRatio?: number;
  farmToken?: LPToken | LeverageErcToken;
}

export interface LeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  leverageFarmingPositions: LeverageFarmingPosition[];
}
