import {
	AmountAble,
	Base,
	ERC20Token,
	PoolToken,
	PoolTokenStaked,
	PriceAble,
	Transaction,
} from './common';

export interface StakeTransaction extends Transaction<'stake'> {
	amountUSD?: number;
	poolName?: string;
	lpToken: PoolToken;
}

export interface ClaimAbleToken extends ERC20Token {
	claimed?: string;
	claimable: string;
	priceUSD?: number;
}

export interface UnStakeTransaction extends Transaction<'unStake'> {
	amountUSD?: number;
	poolName?: string;
	lpToken: PoolToken;
}

export interface ClaimedToken extends ERC20Token, PriceAble, AmountAble {}

export interface ClaimTransaction extends Transaction<'claim'> {
	amountUSD?: number;
	poolName?: string;
	rewardToken: ClaimedToken;
}

type StakingTransaction = StakeTransaction | UnStakeTransaction | ClaimTransaction;

export interface StakingPosition {
	address: string;
	poolId?: string;
	staked: string;
	lpToken: PoolTokenStaked;
	exitedAt?: number;
	rewardToken: ClaimAbleToken;
	liquidityPoolTokens: PoolToken[];
	transactions?: StakingTransaction[];
}

export interface Staking extends Base<'staking'> {
	stakingPositions: StakingPosition[];
}
