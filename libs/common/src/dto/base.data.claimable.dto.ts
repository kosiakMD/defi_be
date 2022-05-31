import { IntegrationClaimableTokenDto, ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';

export class BaseDataClaimable extends BaseData<ProtocolTypeEnum.lending> {
  items: IntegrationClaimableTokenDto[];
}
