export interface CoingeckoRequestContracts {
  platformId: string;
  contractAddresses: string;
  vsCurrencies: string;
}

export interface CoingeckoRequestIds {
  ids: string;
  vsCurrencies: string;
  extras?: {
    address: string;
  };
}

export interface CoingeckoRequestItemIds {
  [key: string]: {
    address: string;
  };
}
