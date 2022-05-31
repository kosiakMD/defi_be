import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './base-data';
import { LiquidityPositionDto } from './liquidity-positions.dto';

export class AutomaticMarketMaker extends BaseData<ProtocolTypeEnum.amm> {
  liquidityPositions: LiquidityPositionDto[] = [];
}
