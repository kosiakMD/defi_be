import {
  DAI_ADDRESS,
  ESD_ADDRESS,
  ETH_ADDRESS,
  ETH_BNB_ADDRESS,
  WBNB_ADDRESS,
  WETH_ADDRESS,
  ZERO_ADDRESS,
} from '@app/common/constant';

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

export const NO_DB_ETH_TOKENS = [ethToken, wethToken, daiToken, esdToken];

export const NO_DB_BNB_TOKENS = [bnbToken, wbnbToken];

export const NO_SCAN_ETH_TOKENS = [ethToken, wethToken];

export const NO_SCAN_BNB_TOKENS = [bnbToken, wbnbToken];

export const cosmosTokenProvidersMap = new Map([
  ['cosmos1', 'cosmoshub'],
  ['osmo1', 'osmosis'],
  ['secret1', 'secret'],
  ['akash1', 'akash'],
  ['cro1', 'crypto-org'],
  ['star1', 'iov'],
  ['sif1', 'sifchain'],
  ['certik1', 'certik'],
  ['iaa1', 'iris'],
  ['regen1', 'regen'],
  ['persistence1', 'persistence'],
  ['sent1', 'sentinel'],
  ['kava1', 'kava'],
  ['ixo1', 'impacthub'],
  ['emoney1', 'emoney'],
  ['agoric1', 'agoric'],
  ['bostrom1', 'cyber'],
  ['juno1', 'juno'],
  ['stars1', 'stargaze'],
  ['axelar1', 'axelar'],
  ['somm1', 'sommelier'],
  ['str1', 'straightedge'],
]);
