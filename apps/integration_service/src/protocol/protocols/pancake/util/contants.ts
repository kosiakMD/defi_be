import { PancakeProtocolEnum } from '@app/common';

export const BUSD_BNB_PAIR_ADDRESS = '0x1b96b92314c44b159149f7e0303511fb2fc4774f';
export const USDT_BNB_PAIR_ADDRESS = '0x20bcc3b8a0091ddac2d0bc30f68e6cbb97de59cd';
export const WBNB_TOKEN_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
export const CURRENCY_USD = 'usd';
export const PANCAKE_V1_PROJECT = 'Pancake V1';
export const PANCAKE_V2_PROJECT = 'Pancake V2';

export const protocolToDbProject = {
  [PancakeProtocolEnum.pancakeV1]: PANCAKE_V1_PROJECT,
  [PancakeProtocolEnum.pancakeV2]: PANCAKE_V2_PROJECT,
};
