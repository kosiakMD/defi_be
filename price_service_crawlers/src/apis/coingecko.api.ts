import axios from 'axios';
import rateLimit from 'axios-rate-limit';

import { CURRENCY } from '../utils/constants';

const baseUrl = 'https://api.coingecko.com/api/v3';
const http = rateLimit(axios.create(), { maxRPS: 2, perMilliseconds: 1000 });

export const getCoins = () => http.get(`${baseUrl}/coins/list?include_platform=true`);

export const getCoin = (id) => http.get(`${baseUrl}/coins/${id}`);

export const getCurrentEthPrice = () => http.get(`${baseUrl}/coins/markets?vs_currency=usd&ids=ethereum`);

export const getCurrentCoinPrices = (addresses) =>
	http.get(`${baseUrl}/simple/token_price/ethereum?contract_addresses=${addresses}&vs_currencies=${CURRENCY}`);

export const getCoinRangePrices = (http_client, token, from, to) =>
	http_client.get(
		`${baseUrl}/coins/ethereum/contract/${token}/market_chart/range?vs_currency=` + CURRENCY + `&from=${from}&to=${to}`,
	);
