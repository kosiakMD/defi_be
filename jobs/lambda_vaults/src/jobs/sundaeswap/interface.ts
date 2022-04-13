import { Pool } from '../cardano/cardano.interfaces';

export type SundaeSwapPoolsResponse = {
  data?: {
    poolsPopular?: Pool[];
  };
};
