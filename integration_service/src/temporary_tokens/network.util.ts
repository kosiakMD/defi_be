import { ChainNameEnum, ChainPrefixEnum } from 'src/common/enum';
import { capitalizeFirstLetter } from 'src/utils/string';

interface NetworkInfo {
  name: string;
  symbol: string;
}

export enum Network {
  ETHEREUM,
}

export const networks: Record<Network, NetworkInfo> = {
  [Network.ETHEREUM]: {
    name: capitalizeFirstLetter(ChainNameEnum.eth),
    symbol: ChainPrefixEnum.eth,
  },
};
