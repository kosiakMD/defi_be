// eslint-disable-next-line max-classes-per-file
import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';

export class BalanceData {
  balance: number;
  value: number;
}

export class LockedToken extends ERC20Token {
  locked: BalanceData;
  unlocked: BalanceData;
  totalBalance: number;
  totalValue: number;
  rewards?: IntegrationERC20TokenDto;
  tokens?: IntegrationERC20TokenDto[];
}

export class BaseDataLocked extends BaseData<ProtocolTypeEnum.staking> {
  items: LockedToken[];
}
