import { Address, ChainAbbrEnum, NftProjectEnum } from '@app/common';
import {
  NftAssetsByAccounts,
  NftCollectionsByAccounts,
  NftServiceInfo,
} from '@app/common/interfaces/nft.interface';

export abstract class NftAbstractService {
  public abstract readonly project: NftProjectEnum;
  public abstract readonly chains: ChainAbbrEnum[];
  public abstract readonly chainsIds: number[];

  public abstract getInfo(): NftServiceInfo;
  public abstract getCollectionsByAccounts(
    accounts: Address[],
    chains: number[],
    collection?: string,
  ): Promise<NftCollectionsByAccounts>;
  public abstract getAssetsByAccounts(
    accounts: Address[],
    collection: string,
    chains: number[],
  ): Promise<NftAssetsByAccounts>;
}
