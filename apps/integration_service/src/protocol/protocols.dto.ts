// eslint-disable-next-line max-classes-per-file
import { Exclude } from 'class-transformer';

import { FeatureResultDto, LiquidityPoolFeatureDto } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

export class ProtocolDto {}

export interface DefaultDataProvider {
  [key: string]: any;
  getDataByAddresses: (address: string, chainId?: ChainIdEnum) => any;
}

export class RawFeaturesDto {
  rawPools: any;
  rawStaking: any;
  rawLending: any;
  rawBorrowing: any;
}

export class FeatureHandleDto<T = LiquidityPoolFeatureDto> {
  @Exclude()
  errors: string[] = [];
  data: FeatureResultDto<T> = new FeatureResultDto();
}
