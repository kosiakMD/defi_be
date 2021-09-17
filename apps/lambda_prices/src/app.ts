import { APIGatewayProxyResult } from 'aws-lambda';

import { getResult } from './index';

export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
  const configuration = {
    rpcUrl: process.env.RPC_URL,
    chainId: Number(process.env.CHAIN_ID),
    stableCoins: JSON.parse(process.env.STABLE_COINS),
    protocol: JSON.parse(process.env.PROTOCOL),
    priceServiceUrl: process.env.PRICE_SERVICE_URL,
    tokenServiceUrl: process.env.TOKEN_SERVICE_URL,
    currencyId: Number(process.env.CURRENCY_ID),
  };

  await getResult(configuration);
  return {
    statusCode: 200,
    body: `Queries: ${configuration}`,
  };
};
