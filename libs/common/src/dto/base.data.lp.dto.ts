import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

export class BaseDataLp extends BaseData<ProtocolTypeEnum.amm> {
  items: LiquidityPoolFeature[];
}
