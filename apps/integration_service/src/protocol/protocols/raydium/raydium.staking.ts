import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { Address, ChainDto, FeatureEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';

import { getListInfo } from './utils/staking/staking-pools'
import { Web3Provider } from '../../../chain/web3.provider';
import { Connection } from '@solana/web3.js';


@Injectable()
export class RaydiumStaking {
  constructor(
    private readonly web3Provider: Web3Provider,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    
    const programId = 'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q';
    const web3: Connection = this.web3Provider.instanceSol();
    
    const stakeAccounts = await getListInfo(web3, addresses[0], programId) || [];

    console.log(stakeAccounts);

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
