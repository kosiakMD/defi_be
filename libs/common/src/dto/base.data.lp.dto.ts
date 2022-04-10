import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { LiquidityPoolFeature } from '../jobs/pools';

export class BaseDataLp extends BaseData<ProtocolTypeEnum.amm> {
  items: LiquidityPoolFeature[];
}
