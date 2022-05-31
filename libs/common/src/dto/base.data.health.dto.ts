import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';

import { HealthFactorDto } from './health-factor.dto';

export class BaseDataHealth extends BaseData<ProtocolTypeEnum.borrowing> {
  items: HealthFactorDto[];
}
