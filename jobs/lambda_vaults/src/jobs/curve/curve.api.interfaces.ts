export interface CrvAprs {
  [key: string]: {
    baseApy: string;
    crvApy: number;
    crvBoost: number;
    additionalRewards: [];
    crvPrice: number;
  };
}

export interface PoolsAprs {
  [key: string]: number;
}

export interface PoolGaugeReward {
  gaugeAddress: string;
  tokenAddress: string;
  tokenPrice: number;
  name: string;
  symbol: string;
  decimals: string;
  apy: number;
}

export interface MainPoolsGaugeRewards {
  [key: string]: PoolGaugeReward[];
}

export interface FactoryV2PoolItem {
  id: string;
  address: string;
  coinsAddresses: string[];
  decimals: string[];
  underlyingDecimals: string[];
  implementationAddress: string;
  assetType: string;
  name: string;
  symbol: string;
  totalSupply: string;
  implementation: string;
  assetTypeName: string;
  coins: [
    {
      address: string;
      usdPrice: number;
      decimals: string;
      symbol: string;
      poolBalance: string;
    },
    {
      address: string;
      usdPrice: number;
      decimals: string;
      symbol: string;
      poolBalance: string;
    },
  ];
  usdTotal: number;
  gaugeAddress?: string;
  gaugeRewards?: [
    {
      gaugeAddress: string;
      tokenAddress: string;
      tokenPrice: number;
      name: string;
      symbol: string;
      decimals: string;
      apy: number;
    },
  ];
}

export interface FactoryAPYItem {
  index: number;
  poolAddress: string;
  poolSymbol: string;
  apyFormatted: string;
  apy: number;
  virtualPrice: number;
  volume: number;
}
