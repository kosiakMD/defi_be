import Joi from 'joi';

export const blockscanConfig = {
  BLOCKSCAN_BNB_KEY: Joi.string().required(),
  BLOCKSCAN_BNB_URL: Joi.string().default('https://api.bscscan.com/api'),
  BLOCKSCAN_ETH_KEY: Joi.string().required(),
  BLOCKSCAN_ETH_URL: Joi.string().default('https://api.etherscan.io/api'),
  BLOCKSCAN_FTM_KEY: Joi.string().required(),
  BLOCKSCAN_FTM_URL: Joi.string().default('https://api.ftmscan.com/api'),
  BLOCKSCAN_MOVR_KEY: Joi.string().required(),
  BLOCKSCAN_MOVR_URL: Joi.string().default('https://api-moonriver.moonscan.io/api'),
  BLOCKSCAN_PLG_KEY: Joi.string().required(),
  BLOCKSCAN_PLG_URL: Joi.string().default('https://api.polygonscan.com/api'),
};
