import { APY } from './apy.dto';
import { Token } from './token.dto';

export interface Vault {
	id: string,
	project: string,
	chain: string,
	name?: string,
	apy: APY,
	tvl: number,
	lpToken: Token,
	liquidityPoolTokens: Token[],
	rewardToken: Token
}
