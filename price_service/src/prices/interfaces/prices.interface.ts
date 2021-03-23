export interface CurrentPrice {
	[key: string]: string
}

export interface HistoricalPrice {
	[key: string]: {
		[key: string]:string
	}
}