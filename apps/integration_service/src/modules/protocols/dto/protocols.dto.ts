// eslint-disable-next-line max-classes-per-file
import { Exclude } from 'class-transformer';

import { ChainDto, FeatureResultDto, Features } from '@app/common';

export class ProtocolDto {}

export interface DefaultDataProvider {
  [key: string]: any;
  getDataByAddresses: (address: string, chain: ChainDto) => any;
}

export class RawFeaturesDto {
  rawPools: any;
  rawStaking: any;
  rawLending: any;
  rawBorrowing: any;
  rawLeverageFarming: any;
}

export class FeatureHandleDto<T extends Features> {
  @Exclude()
  errors: string[] = [];
  data: FeatureResultDto<T> = new FeatureResultDto();
}
