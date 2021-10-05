import { ChainIdEnum, ProjectEnum, ProtocolName, ProtocolTypeEnum } from '@app/common';

export class BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  projectName: ProjectEnum;
  protocolName?: ProtocolName;
  liquidityPositions?: any[];
  stakingPositions?: any[];
  borrowingPositions?: any[];
  lendingPositions?: any[];
  leverageFarmingPositions?: any[];
}