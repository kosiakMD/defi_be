export type Address = string;

export interface BaseData<T = string> {
	userAddress: string;
	protocolName: string;
	protocolType: T;
}

export interface PlatformData {
	balancer: BaseData[],
	curve: BaseData[],
	sushiswap: BaseData[],
	uniswap: BaseData[],
}

export interface ERC20Token {
	address: string;
	name?: string;
	symbol?: string;
	decimals?: number;
	totalSupply?: string;
}

export interface ContractApproval {
	contractAddress: Address;
	amount: string;
	blockTimestamp: number;
	token: ERC20Token;
}

export interface GasPrice {
	rapid: number;
	fast: number;
	standard: number;
	slow: number;
	timestamp: number;
}

export interface GasHistory {
	average: number;
	time: string;
}
