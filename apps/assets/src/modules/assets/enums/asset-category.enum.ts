export enum AssetCategory {
  Stablecoin = 'stablecoin',
  UnverifiedStablecoin = 'unverified-stablecoin',
  NativeCoin = 'native-coin',
  LpToken = 'lp-token',
  UniSwapV2LikeLP = 'lp-uniswapv2-like',
  SaberLP = 'saber-lp',
}

const AssetCategoryNameMap = {
  [AssetCategory.Stablecoin]: 'Stablecoin',
  [AssetCategory.UnverifiedStablecoin]: 'Unverified Stablecoin',
  [AssetCategory.NativeCoin]: 'Native Coin',
  [AssetCategory.LpToken]: 'LP Token',
  [AssetCategory.UniSwapV2LikeLP]: 'Uniswap V2 like LP Token',
  [AssetCategory.SaberLP]: 'Saber LP Token',
};

export function getDefaultCategoryName(code: string) {
  return AssetCategoryNameMap[code] || code;
}
