import { LeverageFarmingPosition, ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

export class BaseLeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  items: LeverageFarmingPosition[];
}
