import { Address, ChainDto } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

export interface IStakingFetcher {
  getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]>;
}
