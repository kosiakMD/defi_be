import { Address, ChainAbbrEnum, ChainIdEnum, NftProjectEnum } from '@app/common';
import { NftAssetsByAccounts, NftServiceInfo } from '@app/common/interfaces/nft.interface';

export abstract class AbstractNftService {
  public abstract readonly project: NftProjectEnum;
  public abstract readonly chains: ChainAbbrEnum[];

  public abstract getInfo(): NftServiceInfo;
  public abstract getAssetsByAccounts(
    accounts: Address[],
    chains: ChainIdEnum[],
  ): Promise<NftAssetsByAccounts>;
}
