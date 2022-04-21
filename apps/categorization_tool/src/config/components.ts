import Joi from 'joi';

import { registerAs } from '@nestjs/config';

export const service = {
  config: registerAs('service', () => ({
    etherscanApiUrl: process.env.ETHERSCAN_API_URL,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    screenshotsDir: process.env.DIR_SAVE_SCREENSHOTS,
    screenshotsEnabled: process.env.SCREENSHOTS_ENABLED,
    bscscanApiUrl: process.env.BSCSCAN_API_URL,
    bscscanApiKey: process.env.BSCSCAN_API_KEY,
    tenderlyApiURL: process.env.TENDERLY_API_URL,
    githubOAuthToken: process.env.GITHUB_OAUTH_TOKEN,
    testRun: process.env.TEST_RUN,
  })),
  validation: {
    ETHERSCAN_API_URL: Joi.string().required(),
    ETHERSCAN_API_KEY: Joi.string().optional(),
    DIR_SAVE_SCREENSHOTS: Joi.string().optional(),
    SCREENSHOTS_ENABLED: Joi.string().required(),
    BSCSCAN_API_URL: Joi.string().required(),
    BSCSCAN_API_KEY: Joi.string().optional(),
    TENDERLY_API_URL: Joi.string().required(),
    GITHUB_OAUTH_TOKEN: Joi.string().optional(),
    TEST_RUN: Joi.boolean().optional(),
  },
};
