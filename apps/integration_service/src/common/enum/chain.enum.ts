export enum ChainAbbrEnum {
  eth = 'eth',
  bsc = 'bsc',
  plg = 'plg',
  ftm = 'ftm',
  arbi = 'arbi',
  avax = 'avax',
}

export enum ChainIdEnum {
  eth = 1,
  bsc = 2,
  plg = 3,
  ftm = 4,
  arbi = 5,
  avax = 6,
}

export enum ChainNameEnum {
  eth = 'ethereum',
  bsc = 'binance',
  plg = 'polygon',
  ftm = 'fantom',
  arbi = 'arbitrum',
  avax = 'avalanche',
}

export const ChainIdToAbbr = {
  [ChainIdEnum.eth]: ChainAbbrEnum.eth,
  [ChainIdEnum.bsc]: ChainAbbrEnum.bsc,
  [ChainIdEnum.plg]: ChainAbbrEnum.plg,
  [ChainIdEnum.ftm]: ChainAbbrEnum.ftm,
  [ChainIdEnum.arbi]: ChainAbbrEnum.arbi,
  [ChainIdEnum.avax]: ChainAbbrEnum.avax,
};
