// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';

export class BaseDataAirdrop extends BaseData<ProtocolTypeEnum.airdrop> {
  items: AirdropPositionDto[];
  locked?: number;
}

export class AirdropPositionDto {
  id: number = null;
  name: string = null;
  token: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
}
