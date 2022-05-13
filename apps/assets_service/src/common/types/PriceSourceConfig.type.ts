export type PriceSourceConfig = {
  chainId: number;
  factoryAddress: string;
  stableCoinAddresses: string[];
  baseURL: string;
  path: string;
  maxItems?: number;
  take?: number;
  gqlString?: string;
  keepHistoricalPricesJobLastExecutionTime?: boolean;
  requestDelay?: number;
  currentPriceJobInterval?: number;
  historicalPriceJobInterval?: number;
};
