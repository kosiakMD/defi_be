// eslint-disable-next-line max-classes-per-file
import { ProtocolTypeEnum } from '@app/common/enum';

import { BaseData } from './BaseData';

export type TokenSymbol = string;

export class StakingProjectDto extends BaseData<ProtocolTypeEnum.staking> {
  stakingPositions: any[] = [];
}
