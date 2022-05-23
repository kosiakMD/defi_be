export const WING_RIDERS_ADA_ASSET_NAME = '4c';
export const WING_RIDERS_CONTRACT_POLICY_ID =
  '026a18d04a0c642759bb3d83b12e3344894e5c1c7b2aeb1a2113a570';
export const WING_RIDERS_MAX_TOTAL_SUPPLY = '9000000000000000000';
export const WING_RIDERS_DEFAULT_TOTAL_SUPPLY = '1000';

export const ADA_TOKEN_TICKER = 'ADA';
export const ADA_TOKEN_DECIMALS = 6;
export const LOVELACE_TOKEN_TICKER = 'lovelace';

export const chainIdsMap = process.env.CHAIN_IDS.split(',').reduce((res, chain) => {
  res.set(chain, chain);
  return res;
}, new Map());
