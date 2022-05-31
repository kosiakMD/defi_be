import { LeverageFarmingPosition, ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';

export class BaseLeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  items: LeverageFarmingPosition[];
}
