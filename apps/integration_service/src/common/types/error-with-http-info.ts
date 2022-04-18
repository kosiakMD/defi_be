export type ErrorWithHttpInfo = Error & {
  request?: { host: string; path: string };
  response?: any;
};
