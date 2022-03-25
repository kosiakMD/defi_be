import retry from 'async-retry';

import { isBSC, isETH } from '../utils/common';
import { CURRENCY } from '../utils/constants';
import { createHttpClient } from '../utils/tor';

const { http, refreshIpAddress } = createHttpClient();

export const handleHttpError = async (error, bail: (e: Error) => void = null) => {
  const { response } = error;
  if (response) {
    // handle too many requests
    if (response.status === 429) {
      await refreshIpAddress();
    }
    // handle Gateway Time-out
    if (response.status === 504) {
      await refreshIpAddress();
    }
    if (response.status === 403) {
      await refreshIpAddress();
    }
    // Not retry on 404
    if (response.status === 404) {
      if (bail) {
        return bail(error);
      }
    }
  }
  throw error;
};

export const axiosRetry = <T>(action: () => T): Promise<T> => {
  return retry(
    async (bail) => {
      try {
        return await action();
      } catch (error: any) {
        await handleHttpError(error, bail);
      }
    },
    {
      retries: 6,
      randomize: true,
      shouldResetTimeout: true,
      minTimeout: 1000,
      maxRetryTime: 100000,
    },
  );
};

const baseUrl = 'https://api.coingecko.com/api/v3';
//const http = rateLimit(axios.create(), { maxRPS: 2, perMilliseconds: 1000 });

export const getCoins = () => http.get(`${baseUrl}/coins/list?include_platform=true`);

export const getCoin = (id) => http.get(`${baseUrl}/coins/${id}`);

export const getCurrentEthPrice = () =>
  http.get(`${baseUrl}/coins/markets?vs_currency=usd&ids=ethereum`);

export const getCurrentBnbPrice = () =>
  http.get(`${baseUrl}/coins/markets?vs_currency=usd&ids=binancecoin`);

export const getCurrentBtcPrice = () =>
  http.get(`${baseUrl}/coins/markets?vs_currency=usd&ids=bitcoin`);

export const getCurrentCoinPrices: any = async (addresses) =>
  axiosRetry(async () => {
    const { data } = await http.get(
      `${baseUrl}/simple/token_price/ethereum?contract_addresses=${addresses}&vs_currencies=${CURRENCY}`,
    );
    return { data };
  });

export const getCoinRangePrices = (coin, from, to) =>
  axiosRetry(async () => {
    if (isETH(coin)) {
      const result = await http.get(
        `${baseUrl}/coins/ethereum/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
      );
      return result;
    } else if (isBSC(coin)) {
      const result = await http.get(
        `${baseUrl}/coins/binancecoin/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
      );
      return result;
    }

    const result = http.get(
      `${baseUrl}/coins/ethereum/contract/${coin.address}/market_chart/range?vs_currency=` +
        CURRENCY +
        `&from=${from}&to=${to}`,
    );

    return result;
  });

export const getCoinHistoricalRangePrices = (httpClient, coin, from, to) =>
  httpClient.get(
    `${baseUrl}/coins/${coin}/market_chart/range?vs_currency=` +
      CURRENCY +
      `&from=${from}&to=${to}`,
  );
