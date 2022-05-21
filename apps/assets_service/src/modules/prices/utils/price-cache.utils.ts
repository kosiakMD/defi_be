export const getAssetPriceCacheKey = ({ address, chainId, sourceId }): string => {
  return `assets-service-asset-current-price-${address}-${chainId}-${sourceId}`;
};

export const getAssetAveragePricesCacheKey = ({ address, chainId }): string => {
  return `assets-service-asset-average-prices-${address}-${chainId}`;
};
