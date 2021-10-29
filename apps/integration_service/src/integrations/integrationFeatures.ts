// eslint-disable-next-line max-classes-per-file
import { ProtocolName } from '@app/common';

import { StakingPosition } from '../interfaces/staking.position.interfaces';
import { FeatureResult } from '../protocol/features/features.types';
import { LiquidityPoolFeature } from './integrations.dto';

export interface APY {
  day: number;
  week: number;
  month: number;
}

export interface Currency {
  id: number;
  name: string;
}

export interface Price {
  value: number;
  currency?: Currency;
}

export interface Balance {
  value: number;
  raw?: string;
  currencyValue?: Price;
}

export interface Source {
  name: ProtocolName;
  proportion: number;
}

export interface CryptoCurrency {
  id: number;
  name: string;
}

export interface GasPriceDto {
  value: number;
  currency: CryptoCurrency;
}

export interface Gas {
  used: number; // amount
  price: GasPriceDto;
  fee: Price;
}

export type FeatureName = string;

// TODO remove StakingPosition asfter StakingPositionFeatureDto will be done
export type FeatureDto<T = LiquidityPoolFeature | StakingPosition> = Record<
  FeatureName,
  FeatureResult<T> | FeatureResult<T>[]
>;
