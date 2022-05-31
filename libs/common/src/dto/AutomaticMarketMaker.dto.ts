import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { LiquidityPositionDto } from './LiquidityPositions.dto';

export class AutomaticMarketMaker extends BaseData<ProtocolTypeEnum.amm> {
  liquidityPositions: LiquidityPositionDto[] = [];
}
