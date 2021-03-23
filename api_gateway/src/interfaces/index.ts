export type Address = string;

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
