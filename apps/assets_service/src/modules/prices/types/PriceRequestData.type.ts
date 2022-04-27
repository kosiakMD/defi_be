import { AxiosRequestConfig } from 'axios';

export type PriceRequestData = {
  request: AxiosRequestConfig;
  chainId: number;
};
