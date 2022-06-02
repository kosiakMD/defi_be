import Joi from 'joi';

import { registerAs } from '@nestjs/config';

export const services = {
  config: registerAs('services', () => ({
    integrations: process.env.INTEGRATION_SERVICE_URL,
  })),
  validation: {
    INTEGRATION_SERVICE_URL: Joi.string().required(),
  },
};

export const multifarm = {
  config: registerAs('multifarm', () => ({
    apiKey: process.env.MULTIFARM_API_KEY,
    graphQLEndpoint: process.env.MULTIFARM_GRAPHQL_ENDPOINT,
  })),
  validation: {
    MULTIFARM_API_KEY: Joi.string().required(),
    MULTIFARM_GRAPHQL_ENDPOINT: Joi.string().default('https://commercial.multifarm.fi/graphql'),
  },
};
