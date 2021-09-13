import axios from 'axios';
import rateLimit from 'axios-rate-limit';

type Coin = {
  id: string;
  name: string;
  symbol: string;
  platforms: { [key: string]: string };
};

type CoinDetails = {
  id: string;
  // eslint-disable-next-line camelcase
  asset_platform_id: string;
  // eslint-disable-next-line camelcase
  contract_address: string;
  symbol: string;
};

const baseUrl = 'https://api.coingecko.com/api/v3';
// NOTE: 1 request per 700 ms
const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 800 });

export const getCoins = (): Promise<{ data: Coin[] }> =>
  http.get(`${baseUrl}/coins/list?include_platform=true`);

export const getCoin = (id: string): Promise<{ data: CoinDetails }> =>
  http.get(`${baseUrl}/coins/${id}`);
