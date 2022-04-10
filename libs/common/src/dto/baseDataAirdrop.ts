// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { IntegrationClaimableTokenDto, IntegrationERC20TokenDto } from '../jobs/staking';

export class BaseDataAirdrop extends BaseData<ProtocolTypeEnum.airdrop> {
  items: AirdropPositionDto[];
  locked?: number;
}

export class AirdropPositionDto {
  id: number = null;
  name: string = null;
  token: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
  rewards: IntegrationClaimableTokenDto[] = [plainToClass(IntegrationClaimableTokenDto, {})];
}
