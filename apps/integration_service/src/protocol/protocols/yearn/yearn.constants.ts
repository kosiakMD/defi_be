import { Address, ChainIdEnum } from '@app/common';

export const ironBankAddressByChain = new Map<ChainIdEnum, Address>([
  [ChainIdEnum.eth, '0xFF0bd2d0C7E9424ccB149ED3757155eEf41a793D'],
  [ChainIdEnum.ftm, '0x8CafAF31Ee6374C02EedF1AD68dDb193dDAC29A2'],
  [ChainIdEnum.arbi, '0xf900ea42c55D165Ca5d5f50883CddD352AE48F40'],
]);
