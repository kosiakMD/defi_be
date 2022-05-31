import { Address, ChainIdEnum } from '@app/common';

export interface IAssetsManager {
  getTokens(addresses: Address[], chainId: ChainIdEnum): Promise<[Address, any][]>;
}
