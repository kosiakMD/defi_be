import Joi from 'joi';

import { registerAs } from '@nestjs/config';

export const service = {
  config: registerAs('service', () => ({
    looksrareApiUrl: process.env.LOOKSRARE_API_URL,
    looksrareSubgraphUrl: process.env.LOOKSRARE_SUBGRAPH_URL,
  })),
  validation: {
    LOOKSRARE_API_URL: Joi.string().default('https://api.looksrare.org'),
    LOOKSRARE_SUBGRAPH_URL: Joi.string().default(
      'https://api.thegraph.com/subgraphs/name/looksrare/exchange',
    ),
  },
};
