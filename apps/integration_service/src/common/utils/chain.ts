import { plainToClass } from 'class-transformer';

import { ChainDto } from '@app/common/dto/chain.dto';
import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common/enum';

export const getChainList = (): ChainAbbrEnum[] => Object.values(ChainAbbrEnum);

export const getChainByAbbr = (symbol: ChainAbbrEnum | string): ChainDto => {
  return plainToClass(ChainDto, {
    id: ChainIdEnum[symbol],
    name: ChainNameEnum[symbol],
    abbr: ChainAbbrEnum[symbol],
  });
};

export const getChainById = (chainId: ChainIdEnum): ChainDto => {
  return getChainByAbbr(ChainIdEnum[chainId]);
};
