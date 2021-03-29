import { Base, PriceAbleToken } from './common';

export interface Deposit extends Base<'deposit'> {
	depositPositions: DepositPosition[];
}

export interface DepositPosition {
	address: string;
	name?: string;
	deposited: string;
	depositedToken: PriceAbleToken;
}
