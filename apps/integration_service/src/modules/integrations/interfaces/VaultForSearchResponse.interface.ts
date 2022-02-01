import { ChainIdEnum, FeatureEnum } from '@app/common/enum';

export interface VaultForSearchResponse {
  id: number;
  chainId: ChainIdEnum;
  feature: FeatureEnum;
  protocol: string;
}
