// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { Asset, LPToken, PoolToken, RewardToken, Vault } from '../interfaces';
import EthereumAddressDto from './EthereumAddress.dto';
import PoolTokenDto from './PoolToken.dto';
import { TokenCommon } from './TokenCommon.dto';

class APY implements APY {
	@ApiProperty({ type: Number, example: 42.96448987689843 })
	day: number;

	@ApiProperty({ type: Number, example: 40.23741031634904 })
	week: number;

	@ApiProperty({ type: Number, example: 41.35642187142753 })
	month: number;
}

class RewardTokenDTO extends TokenCommon implements RewardToken {
	@ApiProperty({ type: Number, example: 3.14 })
	priceUSD: number;
}

class LPTokenDTO implements LPToken {
	@ApiProperty({ type: EthereumAddressDto, example: '0xd905e2eaebe188fc92179b6350807d8bd91db0d8' })
	id: Asset;

	@ApiProperty({ type: String, example: 'Curve.fi DAI/USDC/USDT/PAX' })
	name: string;
}

export default class VaultDto implements Vault {
	@ApiProperty({ type: EthereumAddressDto, example: '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc' })
	id: Asset;

	@ApiProperty({ type: String, example: 'Uniswap' })
	projectName: string;

	@ApiProperty({ type: String, example: 'pax' })
	name: string;

	@ApiProperty({ type: APY })
	APY: APY;

	@ApiProperty({ type: Number, example: 6974003.81675021 })
	TVL: number;

	@ApiProperty({ type: LPTokenDTO })
	lpToken: LPToken;

	@ApiProperty({ type: PoolTokenDto, isArray: true })
	liquidityPoolTokens: PoolToken[] = [];

	@ApiProperty({ type: RewardTokenDTO })
	rewardToken: RewardToken;
}
