// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { IntegrationERC20TokenDto } from '../jobs/staking';

export class BaseDataMint extends BaseData<ProtocolTypeEnum.mint> {
  items: IntegrationMintPositionDto[];
}

export class IntegrationMintPositionDto {
  mintedToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
  collateral: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
}
