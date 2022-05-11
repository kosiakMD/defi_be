export type PriceSourceConfig = {
  chainId: number;
  factoryAddress: string;
  stableCoinAddresses: string[];
  baseURL: string;
  path: string;
  maxItems?: number;
  take?: number;
  gqlString?: string;
  keepHistoricalPrices?: boolean;
  requestDelay?: number;
  currentPriceJobInterval?: number;
};
