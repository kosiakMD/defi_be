import { CHAIN_CURRENCY_ADDRESS, BNB_ADDRESS, ETH_CHAIN_ID, BNB_CHAIN_ID } from './constants';

export const toTimestamp = (date: Date) => Math.round(date.getTime() / 1000);
export const isETH = (coin) =>
  coin.address === CHAIN_CURRENCY_ADDRESS && coin.chain_id === ETH_CHAIN_ID;
export const isBSC = (coin) => coin.address === BNB_ADDRESS && coin.chain_id === BNB_CHAIN_ID;
export const isChainCurrency = (address: string) => address.indexOf(CHAIN_CURRENCY_ADDRESS) >= 0;
