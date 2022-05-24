export type CoinmarketcapToken = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  is_active: number;
  first_historical_data: string;
  last_historical_data: string;
  platform: CoinmarketcapPlatform;
};

type CoinmarketcapPlatform = { [key: string]: string };
