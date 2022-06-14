export enum PriceJobName {
  CLEAR_HISTORICAL_PRICES = 'clear-historical-prices',
  UPDATE_HISTORICAL_PRICES = 'update-historical-prices',
  UPDATE_CURRENT_PRICES = 'update-current-prices',
  UPDATE_CURRENT_PRICES_FROM_SOURCE = 'update-current-prices-from-source',
}

export enum AssetJobName {
  UPDATE_TRACKED_ASSETS = 'update-tracked-assets',
  ASSET_METADATA = 'asset-metadata',
  REPROCESS_ASSETS_WITHOUT_ICONS = 'reprocess-assets-without-icons',
  UPDATE_UNIV2_LIKE_ASSETS_LP = 'update-univ2-like-assets-lp',
}
