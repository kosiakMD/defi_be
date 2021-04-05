export type Address = string;

export type TokenSymbol = string;

export type DateString = string;

export interface BaseData<T = string> {
	userAddress: string;
	protocolName: string;
	protocolType: T;
}

export interface PlatformData {
	balancer: BaseData[];
	curve: BaseData[];
	sushiswap: BaseData[];
	uniswap: BaseData[];
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

export interface PoolToken {
	id: Address; // Ethereum,
	name: string;
	symbol: TokenSymbol;
	percentage: number;
}

export interface Token {
	id: number;
	is_stable: number;
	name: string;
	coingecko_id: string;
	address: Address;
	decimals: number;
	abi_type_id: number;
	created_at: string;
	price: number;
}

export interface APY {
	day: number;
	week: number;
	month: number;
}

export interface IL {
	day: number;
	dayUSD: number;
	week: number;
	weekUSD: number;
	month: number;
	monthUSD: number;
}

export interface Pool {
	id: string; // Ethereum
	projectName: string;
	reserveUSD: number;
	fee24h: number;
	tokens: PoolToken[];
	APY: APY;
	IL: IL;
}

export interface PriceHistoricalRequest {
	addresses: Address[];
	timestamps: DateString[];
}
