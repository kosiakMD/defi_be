import { FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '../enum';
import { ProtocolName } from '../types';
import { ChainDto } from './chain.dto';

export class BaseData<T = keyof typeof ProtocolTypeEnum> {
  chain: ChainDto;
  userAddress: string;
  protocolType: T;
  projectName: ProjectEnum;
  feature?: FeatureEnum;
  total?: number;
  protocolName?: ProtocolName;
  liquidityPositions?: any[];
  stakingPositions?: any[];
  borrowingPositions?: any[];
  lendingPositions?: any[];
  leverageFarmingPositions?: any[];
}
