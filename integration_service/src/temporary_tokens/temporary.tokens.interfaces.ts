/* eslint-disable camelcase */
export interface CoinsMarketsTop {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
}

export interface CoinMarketCapData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  is_active: number;
  first_historical_data: string;
  last_historical_data: string;
  platform?: {
    id?: number;
    name?: string;
    symbol?: string;
    slug?: string;
    token_address?: string;
  };
  coinGeckoId?: string;
}

export interface Platform {
  [key: string]: string;
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  platforms?: Platform;
}

export interface CoinMarketCapResponse {
  status: {
    timestamp: string;
    error_code: number;
    error_message: any;
    elapsed: number;
    credit_count: number;
    notice: any;
  };
  data?: CoinMarketCapData[];
}

export interface UsdPrice {
  usd: number;
}

export type CoinGeckoSimplePrice = Record<string, UsdPrice>;
