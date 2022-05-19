import { PriceSourceStrategies } from '../../../common/enum/price-source-strategies.enum';
import { PriceSourceConfig } from '../../../common/types/price-source-config.type';

export type PriceJobData = {
  sourceId: number;
  strategy: PriceSourceStrategies;
  config: PriceSourceConfig;
  clearDBOnCurrentPrices?: boolean;
};
