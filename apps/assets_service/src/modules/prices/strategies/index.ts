import { PriceSourceStrategies } from 'apps/assets_service/src/common/enum/PriceSourceStrategies.enum';

import { CoingeckoStrategy } from './coingecko.strategy';
import { DebankStrategy } from './debank.strategy';
import { SolanaStrategy } from './solana.strategy';
import { PriceStrategy } from './strategy';
import { SundaeswapStrategy } from './sundaeswap.strategy';
import { TheGraphStrategy } from './thegraph.strategy';

// TODO: Ideally we should be able to add
const priceStrategies = new Map<string, PriceStrategy>([
  [PriceSourceStrategies.COINGECKO, new CoingeckoStrategy()],
  [PriceSourceStrategies.DEBANK, new DebankStrategy()],
  [PriceSourceStrategies.SOLANA, new SolanaStrategy()],
  [PriceSourceStrategies.SUNDAESWAP, new SundaeswapStrategy()],
  [PriceSourceStrategies.THE_GRAPH, new TheGraphStrategy()],
]);

export default priceStrategies;
