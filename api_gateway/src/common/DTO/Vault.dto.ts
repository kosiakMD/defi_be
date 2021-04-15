// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { Address, LPToken, PoolToken, RewardToken, Vault } from '../interfaces';
import { VaultAPYDTO } from './APY.dto';
import PoolTokenDto from './PoolToken.dto';
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

  // @ApiProperty({ type: String, example: 'Curve.fi DAI/USDC/USDT/PAX' })
  // name: string;
}

export default class VaultDto implements Vault {
  @ApiProperty({ type: String, example: '25' })
  id: string;

  @ApiProperty({ type: String, example: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd-104' })
  vaultId: string;

  @ApiProperty({ type: String, example: 'hbtc' })
  vaultName: string;

  @ApiProperty({ type: String, example: 'sushiswap' })
  project: string;

  @ApiProperty({ type: String, example: 'eth' })
  chain: string;

  @ApiProperty({ type: VaultAPYDTO })
  apy: VaultAPYDTO;

  @ApiProperty({ type: Number, example: 6974003.81675021 })
  tvl: number;

  @ApiProperty({ type: LPTokenDTO })
  lpToken: LPToken;

  @ApiProperty({ type: PoolTokenDto, isArray: true })
  liquidityPoolTokens: PoolToken[] = [];

  @ApiProperty({ type: RewardTokenDTO })
  rewardToken: RewardToken;

  @ApiProperty({ type: String, example: '2021-04-13T12:17:14.583Z', description: 'UTC DateString' })
  createdAt: string;

  @ApiProperty({ type: String, example: '2021-04-13T16:00:30.395Z', description: 'UTC DateString' })
  updatedAt: string;
}
