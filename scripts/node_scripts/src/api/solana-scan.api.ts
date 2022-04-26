import axios from 'axios';
import rateLimit from 'axios-rate-limit';

type Coin = {
  mintAddress: string;
  tokenSymbol: string;
  tokenName: string;
  priceUst: number;
};

const baseUrl = 'https://public-api.solscan.io';
// NOTE: 1 request per 700 ms
const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 2000 });

export const getTokens = (
  offset = 0,
  limit = 100,
): Promise<{ data: { total: number; data: Coin[] } }> =>
  http.get(
    `${baseUrl}/token/list?sortBy=market_cap&direction=desc&limit=${limit}&offset=${offset}`,
  );
