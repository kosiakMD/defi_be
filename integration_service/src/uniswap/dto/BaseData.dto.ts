import { ApiProperty } from '@nestjs/swagger';

import {
  ChainIdEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolName,
  ProtocolTypeEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
} from 'src/common/enum';

import { BaseData, StakingPosition, txs } from '../../interfaces/transactions.interfaces';
import { liquidityPositionDto } from './liquidity.position.dto';
import { StakingPositionDto } from './staking.position.dto';
import { txsDto } from './txs.dto';

export default class BaseDataDto<T = ProtocolTypeEnum> implements BaseData<T> {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  userAddress: string;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.uniswap })
  projectName: ProjectEnum;

  @ApiProperty({
    enum: [PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum],
    enumName: 'PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum',
    example: UniswapProtocolEnum.uniswapV2,
    required: false,
  })
  protocolName: ProtocolName;

  @ApiProperty({
    enum: ProtocolTypeEnum,
    enumName: 'ProtocolTypeEnum',
    example: ProtocolTypeEnum.amm,
  })
  protocolType: T;

  @ApiProperty({ type: [StakingPositionDto], required: false })
  stakingPositions?: StakingPosition[];

  @ApiProperty({ type: [liquidityPositionDto], required: false })
  liquidityPositions?: liquidityPositionDto[];

  @ApiProperty({ type: [txsDto], required: false })
  txs?: txs[];
}
