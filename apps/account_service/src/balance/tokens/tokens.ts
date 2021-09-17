import {
  DAI_ADDRESS,
  ESD_ADDRESS,
  ETH_ADDRESS,
  ETH_BNB_ADDRESS,
  WBNB_ADDRESS,
  WETH_ADDRESS,
  ZERO_ADDRESS,
  WFTM_ADDRESS,
} from '@app/common/constatnt';

export const esdToken = {
  address: ESD_ADDRESS.toLowerCase(),
  symbol: 'ESD',
  name: 'Empty Set Dollar',
  decimals: 18,
  isLp: false,
};

export const daiToken = {
  address: DAI_ADDRESS.toLowerCase(),
  symbol: 'DAI',
  name: 'Dai Stablecoin',
  decimals: 18,
  isLp: false,
};

export const ethToken = {
  address: ETH_ADDRESS.toLowerCase(),
  symbol: 'ETH',
  name: 'Ether',
  decimals: 18,
  isLp: false,
};

export const wethToken = {
  address: WETH_ADDRESS.toLowerCase(),
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
  isLp: false,
};

export const bnbToken = {
  address: ETH_BNB_ADDRESS.toLowerCase(),
  symbol: 'BNB',
  name: 'BNB',
  decimals: 18,
  isLp: false,
};

export const wbnbToken = {
  address: WBNB_ADDRESS.toLowerCase(),
  symbol: 'WBNB',
  name: 'Wrapped BNB',
  decimals: 18,
  isLp: false,
};

export const ftmToken = {
  address: ZERO_ADDRESS.toLowerCase(),
  symbol: 'FTM',
  name: 'Fantom',
  decimals: 18,
  isLp: false,
};

export const wftmToken = {
  address: WFTM_ADDRESS.toLowerCase(),
  symbol: 'WFTM',
  name: 'Wrapped Fantom',
  decimals: 18,
  isLp: false,
};

export const NO_DB_ETH_TOKENS = [ethToken, wethToken, daiToken, esdToken];

export const NO_DB_BNB_TOKENS = [bnbToken, wbnbToken];

export const NO_DB_POLYGON_TOKENS = [];

export const NO_DB_FTM_TOKENS = [ftmToken, wftmToken];

export const NO_DB_ARBITRUM_TOKENS = [];

export const NO_DB_AVAX_TOKENS = [];

export const NO_SCAN_ETH_TOKENS = [ethToken, wethToken];

export const NO_SCAN_BNB_TOKENS = [bnbToken, wbnbToken];
