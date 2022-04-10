import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { LeverageFarmingPosition } from '../interfaces';

export class BaseLeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  items: LeverageFarmingPosition[];
}
