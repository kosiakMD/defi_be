import { ChainAbbrEnum, NftProjectEnum } from '@app/common';
import { NftServiceInfo } from '@app/common/interfaces/nft.interface';

import { AbstractNftService } from '../abstract.nft.service';

export abstract class BasicNftService extends AbstractNftService {
  public abstract readonly project: NftProjectEnum;
  public abstract readonly chains: ChainAbbrEnum[];

  constructor() {
    super();
  }

  public getInfo(): NftServiceInfo {
    return {
      project: this.project,
      chains: this.chains,
    };
  }
}
