import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';
import { rpcValidation } from '@app/common/config/components/rpcs.config';

import { blockscanConfig } from './components/blockscan';
import { blockscoutConfig } from './components/blockscout';
import { dataSourceConfig } from './components/dataSources';

export const validationSchema = Joi.object({
  ...appValidation,
  ...logsValidation,
  ...databaseValidation,
  ...awsValidation,
  ...redisValidation,
  ...rpcValidation,

  // Cache TTL Defaults
  JOBS_CACHE_TTL_IN_SECONDS: Joi.number(),
  POOLS_CACHE_TTL_IN_SECONDS: Joi.number(),
  CHAIN_CACHE_TTL_IN_SECONDS: Joi.number(),
  CURRENCY_CACHE_TTL_IN_SECONDS: Joi.number(),
  PRICE_CACHE_TTL_IN_SECONDS: Joi.number(),

  // Internal Services
  PRICE_SERVICE_URL: Joi.string().required(),
  ACCOUNT_SERVICE_URL: Joi.string().required(),
  ASSETS_SERVICE_URL: Joi.string().required(),
  RPC_SERVICE_URL: Joi.string().required(),

  COVALENT_URL: Joi.string().required(),
  COVALENT_KEY: Joi.string().required(),
  TENDERLY_API_KEY: Joi.string().optional(),

  PLATFORMS_TO_EXCLUDE: Joi.string().allow(''),

  ...dataSourceConfig,
  ...blockscanConfig,
  ...blockscoutConfig,
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
