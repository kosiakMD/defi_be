// I don't know why, but all bentobox subgraph apr responses (supplyAPR, borrowAPR) are set to this
import { ChainIdEnum } from '@app/common';

// https://thegraph.com/hosted-service/subgraph/sushiswap/bentobox
export const MAGIC_BENTOBOX_APR_DECIMALS = 15;

export const SUSHI_ADDRESS = new Map([
  [ChainIdEnum.eth, '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'],
  [ChainIdEnum.harm, '0xbec775cb42abfa4288de81f387a9b1a3c4bc552a'],
  [ChainIdEnum.arbi, '0xd4d42f0b6def4ce0383636770ef773390d85c61a'],
  [ChainIdEnum.celo, '0xd15ec721c2a896512ad29c671997dd68f9593226'],
  [ChainIdEnum.mriver, '0xf390830df829cf22c53c8840554b98eafc5dcbc2'],
  [ChainIdEnum.plg, '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a'],
  [ChainIdEnum.gnosis, '0x2995d1317dcd4f0ab89f4ae60f3f020a4f17c7ce'],
]);
