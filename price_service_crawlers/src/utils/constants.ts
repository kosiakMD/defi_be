export const ETH_DECIMALS = 18;
// NOTE: We use this address for ethereum marking fo simplicity
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const BNB_ADDRESS = '0x0000000000000000000000000000000000000000';
export const CHAIN_CURRENCY_ADDRESS = '0x0000000000000000000000000000000000000000';
export const CHAIN = 'ethereum';
export const BNB_CHAIN = 'bsc';
export const ETH_CHAIN_ID = 1;
export const SECONDS_IN_DAY = 86400;
export const SECONDS_IN_HUNDRED_DAYS = SECONDS_IN_DAY * 100;
export const SECONDS_IN_WEEK = 86400 * 24;
export const BNB_CHAIN_ID = 2;
export const NEW_TOKENS_SECONDS_INTERVAL = 60 * 60 * 24;
export const SECONDS_IN_HOUR = 60 * 60;
export const SECONDS_IN_TEN_MINUTES = 300;
export const CURRENCY = 'usd';
export const TEST_TOKENS = [
  ETH_ADDRESS,
  '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', //BNB
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  '0x514910771af9ca656af840dff83e8264ecf986ca',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0x3883f5e181fccaf8410fa61e12b59bad963fb645',
  '0x3506424f91fd33084466f402d5d97f05f8e3b4af',
  '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5',
  '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
  '0x07e3c70653548b04f0a75970c1f81b4cbbfb606f',
]; // Theta Token

export enum PlatformEnum {
  balancer = 'BALANCER',
  coingecko = 'COINGECKO',
  curve = 'CURVE',
  pancake = 'PANCAKE',
  sushiswap = 'SUSHISWAP',
  uniswap = 'UNISWAP',
}

export const TOKEN_START_DATE = new Date('2013');
