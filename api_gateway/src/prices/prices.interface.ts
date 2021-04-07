import { Asset } from '../common/interfaces';

export interface CurrentPrice {
	[key: string]: string;
}

export interface HistoricalPrice {
	addresses: Asset;
	prices: {
		[index: number]: number;
	}[];
}

export interface HistoricalPrices {
	[index: number]: HistoricalPrice;
}
