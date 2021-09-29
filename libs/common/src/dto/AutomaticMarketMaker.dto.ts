import { LiquidityPositionDto } from '.';
import { ProtocolTypeEnum } from '..';
import { BaseData } from './transactions.dto';

export class AutomaticMarketMaker extends BaseData<ProtocolTypeEnum.amm> {
  isTransferSupported?: boolean;
  liquidityPositions: LiquidityPositionDto[] = [];
}
