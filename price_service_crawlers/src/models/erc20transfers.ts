import { ERC20Token } from './common';

export interface ERC20Transfer {
	fromAddress: string;
	toAddress: string;
	amount: string;
	token: ERC20Token;
	tokenPriceUSD?: number;
	totalPriceUSD?: number;
	logIndex?: number;
}

export interface Transaction {
	hash: string;
	blockNumber: number;
	blockTimeStamp: number;
	gas: string;
	gasPrice: string;
	gasUsedEther: string;
	erc20Transfers: ERC20Transfer[];
}

export interface TransactionsResponse {
	[userAddress: string]: Transaction[];
}
