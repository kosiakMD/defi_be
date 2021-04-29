import { DAI_ADDRESS, ESD_ADDRESS, ETH_BNB_ADDRESS, WETH_ADDRESS } from '../../utils/utils';

export const esdToken = {
  address: ESD_ADDRESS.toLowerCase(),
  symbol: 'ESD',
  name: 'Empty Set Dollar',
  decimals: 18,
};

export const daiToken = {
  address: DAI_ADDRESS.toLowerCase(),
  symbol: 'DAI',
  name: 'Dai Stablecoin',
  decimals: 18,
};

export const ethToken = {
  address: ETH_BNB_ADDRESS.toLowerCase(),
  symbol: 'ETH',
  name: 'Ether',
  decimals: 18,
};

export const wethToken = {
  address: WETH_ADDRESS.toLowerCase(),
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
};

export const bnbToken = {
  address: ETH_BNB_ADDRESS.toLowerCase(),
  symbol: 'BNB',
  name: 'BNB',
  decimals: 18,
};

export const ETH_TOKEN_ARRAY = [ethToken, wethToken, daiToken, esdToken];
