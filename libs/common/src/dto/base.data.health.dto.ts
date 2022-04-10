import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';

import { HealthFactorDto } from './HealthFactor.dto';

export class BaseDataHealth extends BaseData<ProtocolTypeEnum.borrowing> {
  items: HealthFactorDto[];
}
