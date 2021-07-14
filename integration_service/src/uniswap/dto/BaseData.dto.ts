import { ApiProperty } from '@nestjs/swagger';

import { Base } from '../../interfaces/transactions.interfaces';
import { liquidityPositionDto } from './liquidity.position.dto';

export default class BaseDataDto<T = string> implements Base<T> {
  @ApiProperty({ type: Number, example: 1 })
  chainId: number;

  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  userAddress: string;

  @ApiProperty({ type: String, example: 'sushiswap' })
  protocolName: string;

  @ApiProperty({ type: String, example: 'amm' })
  protocolType: T;

  @ApiProperty({ type: [liquidityPositionDto] })
  liquidityPositions: liquidityPositionDto[];
}
