import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { Logger } from '@app/common';
import { HEADER_REQUEST_ID, HEADER_SESSION_ID } from '@app/common/constant';
import { ctx } from '@app/common/helpers/context';

const createKey = (config: AxiosRequestConfig): string => {
  const params = config.params ? ':' + JSON.stringify(config.params) : '';
  return `${config.method.toUpperCase()}:${config.url}${params}`;
};

export const createReqInterceptor = function (logger: Logger, key: string) {
  return function (config: AxiosRequestConfig) {
    key = createKey(config);

    logger.time(key);
    const context = ctx();
    const reqId = context?.reqId;
    const sessionId = context?.sessionId;
    reqId && (config.headers[HEADER_REQUEST_ID] = reqId);
    sessionId && (config.headers[HEADER_SESSION_ID] = sessionId);

    return config;
  };
};

export const createRespSuccessInterceptor = function (logger: Logger, key: string) {
  return function (response: AxiosResponse) {
    key = createKey(response.config);

    logger.timeEnd(key);

    return response;
  };
};

export const createRespFailInterceptor = function (logger: Logger, key: string) {
  return function (err: AxiosError) {
    // if some error inside the logic will come it will not an instance of AxiosError and no .config
    key = createKey(err.config);

    logger.timeEnd(key);

    // Don't forget this line like: it makes your failed HTTP requests resolve with "undefined"
    return Promise.reject(err);
  };
};
