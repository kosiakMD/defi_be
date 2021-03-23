import { ETH_ADDRESS } from './constants';
export const toTimestamp = (date: Date) => Math.round(date.getTime() / 1000);
export const isETH = (address: string) => address === ETH_ADDRESS;
