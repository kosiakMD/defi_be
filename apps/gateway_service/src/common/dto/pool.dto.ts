// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ProjectEnum } from '../enum';
import { Address, Pool, PoolAPY, PoolToken, PoolTokenId } from '../interfaces';
import { PoolAPYDTO } from './apy.dto';
import PoolTokenDto from './pool-token.dto';

class IL implements IL {
  @ApiProperty({ type: Number, example: 1.0611280730220551 })
  day: number;

  @ApiProperty({ type: Number, example: 2569385.08364833 })
  dayUSD: number;

  @ApiProperty({ type: Number, example: -4.273655700974254 })
  week: number;

  @ApiProperty({ type: Number, example: -10348107.349058578 })
  weekUSD: number;

  @ApiProperty({ type: Number, example: 3.3591302800797695 })
  month: number;

  @ApiProperty({ type: Number, example: 8133701.722816457 })
  monthUSD: number;
}

class PoolTokenIdDTO implements PoolTokenId {
  @ApiProperty({ type: String, example: '0x08d22e98d3024c1af130536e0e175ee38c13957b' })
  id: Address;

  @ApiProperty({ type: Number, example: 92077.06746043958 })
  totalSupply: number;
}

export default class PoolDto implements Pool {
  @ApiProperty({ type: Number, example: 2830808 })
  id: number;

  @ApiProperty({ type: String, example: '0x08d22e98d3024c1af130536e0e175ee38c13957b' })
  address: Address;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.uniswap })
  project: ProjectEnum;

  @ApiProperty({ type: Number, example: 99690611 })
  reserveUSD: number;

  @ApiProperty({ type: PoolAPYDTO })
  apy: PoolAPY;

  @ApiProperty({ type: IL })
  il: IL;

  @ApiProperty({ type: PoolTokenIdDTO })
  token: PoolTokenIdDTO;

  @ApiProperty({ type: PoolTokenDto, isArray: true })
  poolTokens: PoolToken[];

  @ApiProperty({ type: String, example: '2021-04-13T12:17:14.583Z', description: 'UTC DateString' })
  createdAt: string;

  @ApiProperty({ type: String, example: '2021-04-13T16:00:30.395Z', description: 'UTC DateString' })
  updatedAt: string;
}
