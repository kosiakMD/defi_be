import { PriceSourceStrategies } from '../../../common/enum/PriceSourceStrategies.enum';
import { PriceSourceConfig } from '../../../common/types/PriceSourceConfig.type';

export type PriceJobData = {
  sourceId: number;
  strategy: PriceSourceStrategies;
  config: PriceSourceConfig;
  clearDBOnCurrentPrices?: boolean;
};
