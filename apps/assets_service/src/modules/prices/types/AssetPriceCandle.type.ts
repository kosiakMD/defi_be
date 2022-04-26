export type AssetPriceCandle = {
  id: number;
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  ticks: number;
  assetId: number;
  timeGranularity;
};
