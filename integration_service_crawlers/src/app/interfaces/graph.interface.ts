interface Variables {
	blockNumber?: number;
}

export interface TheGraphQuery {
	operationName: string;
	variables: Variables;
	query: string;
}
