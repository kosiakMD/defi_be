export const rpcUrl = process.env.RPC_URL;
export const chainId = Number(process.env.CHAIN_ID);
export const stableCoins: string[] = JSON.parse(process.env.STABLE_COINS);
export const protocols: Array<{ name: string; address: string }> = JSON.parse(process.env.PROTOCOL);
export const tokenServiceUrl = process.env.TOKEN_SERVICE_URL;
export const currencyId = Number(process.env.CURRENCY_ID);
export const multicallContractAddress = String(process.env.CONTRACT_ADDRESS);
export const priceServiceUrl = process.env.PRICE_SERVICE_URL;
export const poolsBatchSize = Number(process.env.POOLS_BATCH_SIZE) || 100;
export const minLiquidityRequired = Number(process.env.MIN_LIQUIDIY_REQUIRED) || 2000;
export const baseTokens: string[] = process.env.BASE_TOKENS
  ? JSON.parse(process.env.BASE_TOKENS)
  : [];
