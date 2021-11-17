import { ChainDto, FeatureEnum, ProjectEnum, ProtocolName, ProtocolTypeEnum } from '@app/common';

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
