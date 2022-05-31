import { Address } from '@app/common';

export interface MultifarmAsset {
  // Farm Details
  farm: string;
  url: string;
  stakingLink: string;

  //
  blockchain: string;
  aprYearly: number;
  apyYearly: number;
  tvlStaked: number;

  // Staked Asset
  asset: string;
  assetId: string;
  assetAddress: string;

  // Underlying
  tokenA: string;
  tokenAAddress: Address;
  tokenB: string;
  tokenBAddress: Address;
  tokenC: string;
  tokenCAddress: Address;
  tokenD: string;
  tokenDAddress: Address;

  // Rewards
  rewardTokenA: string;
  rewardTokenAAddress: Address;
  rewardTokenB: string;
  rewardTokenBAddress: Address;
}

interface MultifarmPageMeta {
  total: number;
  page: number;
  pages: number;
}

interface MultifarmGetAssets {
  getAssets: {
    assets: MultifarmAsset[];
    pageMeta: MultifarmPageMeta;
  };
}

export interface IMultifarmGetAssetsQuery {
  data: MultifarmGetAssets;
}

export interface IMultifarmGetAssetsQueryError {
  errors: string;
}

export type MultifarmGetAssetsResponse = IMultifarmGetAssetsQuery | IMultifarmGetAssetsQueryError;

export interface MultifarmQueryPageOptions {
  farmNames: string[];
  hardcodedSkipped: string[];
  found: number;
  total: number;
  offset: number;
  consecutivePageSkips: number;
  limit: 20; // this is the maximum their api support currently
  opportunities: MultifarmAsset[];
}
