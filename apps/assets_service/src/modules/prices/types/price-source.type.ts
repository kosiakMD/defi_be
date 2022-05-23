import { PriceSourceStrategy } from '../enums/price-source-strategy.enum';

export type PriceSource<TConfig = any> = {
  sourceId: number;
  strategy: PriceSourceStrategy;
  config: TConfig;
};
