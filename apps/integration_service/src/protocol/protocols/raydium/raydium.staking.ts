import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { Address, ChainDto, FeatureEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';

@Injectable()
export class RaydiumStaking {
  constructor() {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    return [
      plainToClass(BaseDataStaking, {
        chain: chain,
        userAddress: addresses[0],
        protocolType: ProtocolTypeEnum.staking,
        projectName: 'ray',
        items: [],
        feature: FeatureEnum.staking,
      }),
    ];
  }
}
