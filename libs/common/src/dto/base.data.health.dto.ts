import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

import { HealthFactorDto } from './HealthFactor.dto';

export class BaseDataHealth extends BaseData<ProtocolTypeEnum.borrowing> {
  items: HealthFactorDto[];
}
