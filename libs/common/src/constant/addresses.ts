import { ChainIdEnum } from '@app/common';

export enum CurveAddresses {
  registry = '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
  crvToken = '0xd533a949740bb3306d119cc777fa900ba034cd52',
}

export enum CurveRegistries {
  '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5' = ChainIdEnum.eth,
  '0x094d12e5b541784701fd8d65f11fc0598fbc6332' = ChainIdEnum.plg,
  '0x0f854EA9F38ceA4B1c2FC79047E9D0134419D5d6' = ChainIdEnum.ftm,
  '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6' = ChainIdEnum.avax,
}
