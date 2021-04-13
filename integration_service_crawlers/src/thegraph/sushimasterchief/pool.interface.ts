export interface Pool {
	id: string;
	owner: string;
	pair: string;
	allocPoint: number
	lastRewardBlock: number;
	accSushiPerShare: number;
	balance: number;
	userCount: number;
	slpBalance: number;
	slpAge: number;
	slpAgeRemoved: number;
	slpDeposited: number;
	slpWithdrawn: number;
	timestamp: number;
	block: number;
	updatedAt: number;
	entryUSD: number;
	exitUSD: number;
	sushiHarvested: number;
	sushiHarvestedUSD: number;
}
