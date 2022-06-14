import * as Joi from 'joi';

import { registerAs } from '@nestjs/config';

export const rpcConfig = registerAs('rpc', () => ({
  arbitrum: process.env.ARBITRUM_URL,
  avalanche: process.env.AVAX_URL,
  boba: process.env.BOBA_URL,
  bnb: process.env.BSC_URL,
  celo: process.env.CELO_URL,
  cronos: process.env.CRONOS_URL,
  ethereum: process.env.ETH_URL,
  fantom: process.env.FTM_URL,
  harmony: process.env.HARM_URL,
  heco: process.env.HECO_URL,
  kucoin: process.env.KCC_URL,
  moonriver: process.env.MRIVER_URL,
  okex: process.env.OKEX_URL,
  optimism: process.env.OPT_URL,
  polygon: process.env.POLYGON_URL,
  solana: process.env.SOL_URL,
  gnosis: process.env.GNOSIS_URL,
  terra: process.env.TERRA_URL,
  metis: process.env.METIS_URL,
}));

export const rpcValidation = {
  ARBITRUM_URL: Joi.string().required(),
  AVAX_URL: Joi.string().required(),
  BOBA_URL: Joi.string().required(),
  BSC_URL: Joi.string().required(),
  CELO_URL: Joi.string().required(),
  CRONOS_URL: Joi.string().required(),
  ETH_URL: Joi.string().required(),
  FTM_URL: Joi.string().required(),
  HARM_URL: Joi.string().required(),
  HECO_URL: Joi.string().required(),
  KCC_URL: Joi.string().required(),
  MRIVER_URL: Joi.string().required(),
  OKEX_URL: Joi.string().required(),
  OPT_URL: Joi.string().required(),
  POLYGON_URL: Joi.string().required(),
  SOL_URL: Joi.string().required(),
  GNOSIS_URL: Joi.string().required(),
  TERRA_URL: Joi.string().required(),
  METIS_URL: Joi.string().required(),
};
