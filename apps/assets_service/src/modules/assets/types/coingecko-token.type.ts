import { CoingeckoPlatformEnum } from '@app/common/enum';

export type CoingeckoToken = {
  id: string;
  symbol: string;
  name: string;
  platforms: CoingeckoPlatform;
};

type CoingeckoPlatform = {
  [key in CoingeckoPlatformEnum]: string;
};
