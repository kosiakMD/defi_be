export enum AssetCategory {
  Stablecoin = 'stablecoin',
  UnverifiedStablecoin = 'unverified-stablecoin',
  NativeCoin = 'native-coin',
  LpToken = 'lp-token',
  UniSwapV2LikeLP = 'lp-uniswapv2-like',
  SaberLP = 'saber-lp',
  MinSwapLP = 'minswap-lp',
  BalancerLp = 'balancer-lp',
  BalancerWeightedLpToken = 'balancer-weighted-lp-token',
  // balance of token represents users position, i.e. staked tokens, lp tokens, yearn/beefy tokens
  TokenizedPosition = 'tokenized-position',
  // token has single underlying token
  WithSingleUnderlyingToken = 'single-underlying',
  // value of token can be determined by checking contract balance on underlying token
  UnderlyingBalanceHeldByBaseContract = 'underlying-balance-held-by-base-contract',
}

const AssetCategoryNameMap: Record<AssetCategory, string> = {
  [AssetCategory.Stablecoin]: 'Stablecoin',
  [AssetCategory.UnverifiedStablecoin]: 'Unverified Stablecoin',
  [AssetCategory.NativeCoin]: 'Native Coin',
  [AssetCategory.LpToken]: 'LP Token',
  [AssetCategory.UniSwapV2LikeLP]: 'Uniswap V2 like LP Token',
  [AssetCategory.SaberLP]: 'Saber LP Token',
  [AssetCategory.BalancerWeightedLpToken]: 'Balancer Weighted LP Token',
  [AssetCategory.BalancerLp]: 'Balancer LP Token',
  [AssetCategory.MinSwapLP]: 'MinSwap LP Token',
  [AssetCategory.TokenizedPosition]: 'Tokenized User Position',
  [AssetCategory.WithSingleUnderlyingToken]: 'Single Underlying Asset',
  [AssetCategory.UnderlyingBalanceHeldByBaseContract]:
    'Token value derived from underlying token balance',
};

export function getDefaultCategoryName(code: string) {
  return AssetCategoryNameMap[code] || code;
}
