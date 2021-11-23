import { ChainIdEnum } from '@app/common';

export const rpcUrl = process.env.RPC_URL;
export const chainId: ChainIdEnum = Number(process.env.CHAIN_ID);
export const stableCoins: string[] = JSON.parse(process.env.STABLE_COINS);
export const protocol: Array<{ name: string; address: string }> = JSON.parse(process.env.PROTOCOL);
export const priceServiceUrl = process.env.PRICE_SERVICE_URL;
export const tokenServiceUrl = process.env.TOKEN_SERVICE_URL;
export const currencyId = Number(process.env.CURRENCY_ID);
export const wrappedCoin = String(process.env.WRAPPED_COIN);
export const whiteListCoins: string[] = JSON.parse(process.env.WHITE_LIST_COINS);
export const multicallContractAddress = String(process.env.CONTRACT_ADDRESS);
export const liquidityLimit = Number(process.env.LIQUIDITY_LIMIT);
export const poolUpdateHours = Number(process.env.POOL_UPDATE_HOURS);
