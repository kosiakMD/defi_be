// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { Pool, PoolToken } from '../interfaces';
import EthereumAddressDto from './EthereumAddress.dto';
import PoolTokenDto from './PoolToken.dto';

class APY implements APY {
	@ApiProperty({ type: Number, example: 42.96448987689843 })
	day: number;

	@ApiProperty({ type: Number, example: 40.23741031634904 })
	week: number;

	@ApiProperty({ type: Number, example: 41.35642187142753 })
	month: number;
}

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

export default class PoolDto implements Pool {
	@ApiProperty({ type: EthereumAddressDto, example: '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc' })
	id: string;

	@ApiProperty({ type: String, example: 'Uniswap' })
	projectName: string;

	@ApiProperty({ type: Number, example: 242137132 })
	reserveUSD: 242137132;

	@ApiProperty({ type: Number, example: 312098.949 })
	fee24h: 312098.949;

	@ApiProperty({ type: Object })
	APY = new APY();

	@ApiProperty({ type: Object })
	IL = new IL();

	@ApiProperty({ type: PoolTokenDto, isArray: true })
	tokens: PoolToken[];
}
