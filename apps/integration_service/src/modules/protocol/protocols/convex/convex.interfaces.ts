import { Address, ChainDto } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';

export interface IStakingFetcher {
  getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]>;
}
