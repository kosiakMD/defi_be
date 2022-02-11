import { ChainAbbrEnum, ChainIdEnum, NftProjectEnum } from '@app/common';
import { NftServiceInfo } from '@app/common/interfaces/nft.interface';

import { NftAbstractService } from './nft.abstract.service';

export abstract class NftBasicService extends NftAbstractService {
  public abstract readonly project: NftProjectEnum;
  public abstract readonly chains: ChainAbbrEnum[];
  public abstract readonly chainsIds: ChainIdEnum[];

  constructor() {
    super();
  }

  public getInfo(): NftServiceInfo {
    return {
      project: this.project,
      chains: this.chains,
      chainsIds: this.chainsIds,
    };
  }
}
