// eslint-disable-next-line max-classes-per-file
import { Exclude } from 'class-transformer';

import { ChainIdEnum } from '../common/enum';

import { LiquidityPoolFeature } from '../integrations/integrations.dto';
import { FeatureResultDto } from './features/features.types';

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
  rawLeverageFarming: any;
}

export class FeatureHandleDto<T = LiquidityPoolFeature> {
  @Exclude()
  errors: string[] | Error[] = [];
  data: FeatureResultDto<T> = new FeatureResultDto();
}
