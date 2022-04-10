import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { IntegrationClaimableTokenDto } from './IntegrationClaimableToken.dto';

export class BaseDataClaimable extends BaseData<ProtocolTypeEnum.lending> {
  items: IntegrationClaimableTokenDto[];
}
