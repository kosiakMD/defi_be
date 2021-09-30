// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ProjectEnum } from '@app/common/enum';

import { Address, LPToken, PoolTokenBase, RewardToken, Vault } from '../interfaces';
import { VaultAPYDTO } from './APY.dto';
import LiquidityPoolTokenDto from './LiquidityPoolToken.dto';
import { TokenCommonDTO } from './TokenCommon.dto';

class RewardTokenDTO extends TokenCommonDTO implements RewardToken {
  @ApiProperty({ type: String, example: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2' })
  id: Address;

  @ApiProperty({ type: String, example: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2' })
  address: Address;

  @ApiProperty({ type: String, example: 'SushiToken' })
  name: string;

  @ApiProperty({ type: String, example: 'SUSHI' })
  symbol: string;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @ApiProperty({ type: Number, example: 92077.06746043958 })
  totalSupply: number;

  @ApiProperty({ type: Number, example: 17.09 })
  priceUSD: number;
}

class LPTokenDTO implements LPToken {
  @ApiProperty({ type: String, example: '0xd905e2eaebe188fc92179b6350807d8bd91db0d8' })
  id: Address;
}

export default class VaultDto implements Vault {
  @ApiProperty({ type: String, example: '25' })
  id: string;

  @ApiProperty({ type: String, example: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd-104' })
  vaultId: string;

  @ApiProperty({ type: String, example: 'hbtc' })
  vaultName: string;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.sushiswap })
  project: ProjectEnum;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ type: VaultAPYDTO })
  apy: VaultAPYDTO;

  tvl: number;

  @ApiProperty({ type: LPTokenDTO })
  lpToken: LPToken;

  @ApiProperty({ type: LiquidityPoolTokenDto, isArray: true })
  liquidityPoolTokens: PoolTokenBase[] = [];

  @ApiProperty({ type: RewardTokenDTO })
  rewardToken: RewardToken;

  @ApiProperty({ type: String, example: '2021-04-13T12:17:14.583Z', description: 'UTC DateString' })
  createdAt: string;

  @ApiProperty({ type: String, example: '2021-04-13T16:00:30.395Z', description: 'UTC DateString' })
  updatedAt: string;
}
