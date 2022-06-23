import Joi from 'joi';

export const blockscoutConfig = {
  BLOCKSCOUT_FUSE_URL: Joi.string().default('https://explorer.fuse.io/graphql'),
  BLOCKSCOUT_GNOSIS_URL: Joi.string().default('https://blockscout.com/xdai/mainnet/graphql'),
};
