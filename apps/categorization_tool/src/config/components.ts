import Joi from 'joi';

import { registerAs } from '@nestjs/config';

export const service = {
  config: registerAs('service', () => ({
    etherscanApiUrl: process.env.ETHERSCAN_API_URL,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    screenshotsDir: process.env.DIR_SAVE_SCREENSHOTS,
    bscscanApiUrl: process.env.BSCSCAN_API_URL,
    bscscanApiKey: process.env.BSCSCAN_API_KEY,
  })),
  validation: {
    ETHERSCAN_API_URL: Joi.string().required(),
    ETHERSCAN_API_KEY: Joi.string().optional(),
    DIR_SAVE_SCREENSHOTS: Joi.string().required(),
    BSCSCAN_API_URL: Joi.string().required(),
    BSCSCAN_API_KEY: Joi.string().optional(),
  },
};
