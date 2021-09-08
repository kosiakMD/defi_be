import { plainToClass } from 'class-transformer';
import { capitalizeFirstLetter } from 'src/utils/string';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from 'src/common/enum';

import { ChainDto } from '../dto/chain.dto';

export enum Network {
  ETHEREUM,
}

export const networks: Record<Network, ChainDto> = {
  [Network.ETHEREUM]: plainToClass(ChainDto, {
    id: ChainIdEnum.eth,
    name: capitalizeFirstLetter(ChainNameEnum.eth),
    abbr: ChainAbbrEnum.eth,
  }),
};
