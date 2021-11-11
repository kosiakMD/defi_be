import { Address } from '@app/common';

export interface ISushiSwapERC20Token {
  id: Address;
  name: string;
  symbol: string;
  decimals: string;
}

export interface ISushiSwapSubgraphToken extends ISushiSwapERC20Token {
  derivedETH: string;
  untrackedVolumeUSD: string;
}

export interface ISushiSwapLiquidityPair {
  id: Address;
  reserveUSD: string;
  reserveETH: string;
  trackedReserveETH: string;
  totalSupply: string;
  volumeUSD: string;
  untrackedVolumeUSD: string;

  volumeToken0: string;
  token0Price: string;
  reserve0: string;
  token0: ISushiSwapSubgraphToken;

  volumeToken1: string;
  token1Price: string;
  reserve1: string;
  token1: ISushiSwapSubgraphToken;
}

export interface ISushiSwapLiquidityPosition {
  liquidityTokenBalance: string;
  user: { id: Address };
  pair: ISushiSwapLiquidityPair;
}

export interface ISushiSwapUsers {
  liquidityPositions: ISushiSwapLiquidityPosition[];
}

export interface ISushiSwapPool {
  id: string; // pool id
  pair: Address;
  accSushiPerShare: string;
}

export interface ISushiSwapPoolUser {
  amount: string;
  pool: ISushiSwapPool;
}

export interface ISushiSwapMasterChef {
  users: ISushiSwapPoolUser[];
  masterChef: {
    id: Address;
    sushi: Address;
  };
}

export interface ISushiSwapMiniChef {
  users: ISushiSwapPoolUser[];
  miniChef: {
    id: Address;
    sushi: Address;
  };
}

export interface ISushiSwapSushiBar extends ISushiSwapERC20Token {
  totalSupply: string;
  ratio: string;
  sushi: Address;
}

export interface ISushiSwapSushiBarUser {
  id: Address;
  xSushi: string;
}

export interface ISushiSwapSushiSwapBarResponse {
  users: ISushiSwapSushiBarUser[];
  bar: ISushiSwapSushiBar;
}

export interface ISushiSwapKashiPair {
  id: Address;
  type: string;
  name: string;
  symbol: string;
  supplyAPR: string;
  borrowAPR: string;
  utilization: string;
  asset: ISushiSwapERC20Token;
  collateral: ISushiSwapERC20Token;
}
export interface ISushiSwapUserKashiPair {
  pair: ISushiSwapKashiPair;
  borrowPart: string;
  collateralShare: string;
  assetFraction: string;
}

export interface ISushiSwapBentoBoxToken {
  share: string;
  token: {
    symbol: string;
  };
}
export interface ISushiSwapBentoBoxUsers {
  id: Address;
  kashiPairs: ISushiSwapUserKashiPair[];
  tokens: ISushiSwapBentoBoxToken[];
}
