// eslint-disable-next-line max-classes-per-file
import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { ERC20Token } from '../jobs/token';
import { IntegrationERC20TokenDto } from '../jobs/staking';

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
