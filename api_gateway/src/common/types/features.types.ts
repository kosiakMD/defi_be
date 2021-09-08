import { LiquidityPoolFeature } from '../DTO/integrations.dto';

export type FeatureName = string;

export type FeatureDto = Record<
  FeatureName,
  // | LendingFeature
  // | BorrowFeature
  // | VaultFeature
  // | ExchangeFeature
  // | BalanceFeature
  LiquidityPoolFeature[]
  // | BaseData
>;

export type FeatureResult = FeatureDto | FeatureDto[] | Promise<FeatureDto | FeatureDto[]>;
