import { plainToClass } from 'class-transformer';

import { ChainDto } from '@app/common/dto/chain.dto';
import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common/enum';
import { capitalizeFirstLetter } from '@app/common/utils/string';

import { Network } from '../enum/temporary.tokens.enum';

export const networks: Record<Network, ChainDto> = {
  [Network.ETHEREUM]: plainToClass(ChainDto, {
    id: ChainIdEnum.eth,
    name: capitalizeFirstLetter(ChainNameEnum.eth),
    abbr: ChainAbbrEnum.eth,
  }),
};
