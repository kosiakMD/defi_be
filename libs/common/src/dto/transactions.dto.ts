// eslint-disable-next-line max-classes-per-file
import { ProtocolTypeEnum } from '@app/common/enum';

import { BaseData } from './BaseData';
import { Transaction } from './Transaction';

export type TokenSymbol = string;

export class TransactionProjectDto extends BaseData<ProtocolTypeEnum.transaction> {
  txs: Transaction[] = [];
}

export class StakingProjectDto extends BaseData<ProtocolTypeEnum.staking> {
  stakingPositions: any[] = [];
}
