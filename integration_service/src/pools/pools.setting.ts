export const CHAIN_ETH = 'eth';
export const CHAIN_ID_ETH = 1;
export const CHAIN_BSC = 'bsc';
export const CHAIN_ID_BSC = 2;
export const PROJECT_BALANCER = 'balancer';
export const PROJECT_CURVE = 'curve';

export const UNI_MIN_RESERVE = 500000;
export const PROJECT_UNISWAP = 'uniswap';
// such pairs not necessary to display (they are not 'tracked' and values is not real):
// todo: consider to move this config to the database
export const UNI_PAIRS_BLACKLIST: Array<string> = [
  '0x1ff074ddee048d8a4cd87c35057587a75001d17e',
  '0xe6c78983b07a07e0523b57e18aa23d3ae2519e05',
  '0x3c92befe32cdf5564ff2f3092edacb9f9e40d508',
  '0x0617d5ffb29c03ac35f1863b8a50ce1b52d446f6',
  '0xe2f95dae6c5763c357447fe1ffb3f2a884bdc0b5',
];

export const PROJECT_SUSHISWAP = 'sushiswap';
export const SUSHISWAP_MIN_RESERVE = 500000;
export const SUSHISWAP_PAIRS_BLACKLIST: Array<string> = [];

export const PROJECT_PANCAKE = 'Pancake V1';
export const PROJECT_PANCAKE_V2 = 'Pancake V2';
export const PANCAKE_MIN_RESERVE = 100000;
