import { TokenPriceRequest } from '../models/prices';
import { TheGraphQuery } from './query';

export function getSushiswapPoolsQuery(skip): TheGraphQuery {
	return {
		operationName: 'getPairs',
		variables: {},
		query:
			`
    query pairDayDataQueryw {
      dataPairs: pairs (where:{reserveUSD_gt:"25000"}, orderBy:reserveUSD, orderDirection:desc, first:1000, skip:` +
			skip * 1000 +
			`) {
        id
        token0 {
          name
          symbol
        }
        token1 {
          name
          symbol
        }
      }
    }`,
	};
}

export function firstTxTimestamp(): TheGraphQuery {
	return {
		operationName: 'getFirstTimestamp',
		variables: {},
		query: `
    query firstQuery {
      transactions: 
        transactions (first:1, orderBy:timestamp, orderDirection:asc) {
          id
          blockNumber
          timestamp
        }
    }`,
	};
}

export function firstBlockAfterTimestamp(timestamp: number): TheGraphQuery {
	return {
		operationName: 'getFirstBlockTimestamp',
		variables: {
			timestamp: timestamp,
		},
		query: `
    query firstQuery {
      blocks: 
        transactions(first: 1, orderBy: blockNumber, orderDirection: asc, where:
          {timestamp_gt: ${timestamp}}) {
          blockNumber
        }
    }`,
	};
}

export function firstDailyBlockPairs(block_number: number, token: string): TheGraphQuery {
	return {
		operationName: 'getFirstBlockTimestamp',
		variables: {
			block_number: block_number,
			token: token,
		},
		query: `
    query firstQuery {
      pairs: 
        pairs (block:{number:${block_number}},where:{id_in:
          ["${token}"]}) {
          id
          reserveUSD
          totalSupply
        }
    }`,
	};
}

export function getSushiswapCurrentPriceQuery(address: string): TheGraphQuery {
	return {
		operationName: 'getPairsPrice',
		variables: {
			address: address,
		},
		query: `
    query tokenPairCurrentPrice {
      dataPairs: 
        pairs (where:{id_in:["${address}"]}) {
          totalSupply
          reserveUSD
        }

    }`,
	};
}

export function getLiquidityPositionsQuery(address: string): TheGraphQuery {
	return {
		operationName: 'liquidityPositions',
		variables: {
			address: address,
		},
		query: `
    query liquidityPositionQuery($address: String!) {
      liquidityPositions (where:{user:$address}, first:1000) {
        liquidityTokenBalance
        pair {
          id
          totalSupply
          reserveUSD
          reserve0
          reserve1
          token0Price
          token1Price
          totalSupply
          token0 {
            id
            name
            symbol
            decimals
          }
          token1 {
            id
            name
            symbol
            decimals
          }
        }
      }
      mints (where:{to:$address}, first:1000) {
        transaction {
          id
          timestamp
          blockNumber
        }
        liquidity
        amount0
        amount1
        amountUSD
        pair {
          id
          token0 {
            id
            name
            symbol
            decimals
          }
          token1 {
            id
            name
            symbol
            decimals
          }
        }
      }
      burns (where:{sender:$address}, first:1000) {
        transaction {
           id
           timestamp
           blockNumber
         }
        liquidity
        amount0
        amount1
        amountUSD
        pair {
          id
          token0 {
            id
            name
            symbol
            decimals
          }
          token1 {
            id
            name
            symbol
            decimals
          }
        }
      }
      swapsFrom:swaps (where:{from:$address}, first:1000) {
        transaction {
           id
           timestamp
           blockNumber
         }
        amount0In
        amount1In
        amount0Out
        amount1Out
        amountUSD
        logIndex
        pair {
          id
          token0 {
            id
            name
            symbol
            decimals
          }
          token1 {
            id
            name
            symbol
            decimals
          }
        }
      }
      liquidityPositionSnapshots(where:{user:$address}, first:1000) {
        timestamp
        pair {
          id
        }
        token0PriceUSD
        token1PriceUSD
        liquidityTokenTotalSupply
        reserveUSD
        reserve0
        reserve1
        liquidityTokenBalance
      }
    }`,
	};
}

export function getliquidityPositionSnapshotsQuery(
	address: string,
	skipLimit: number,
): TheGraphQuery {
	return {
		operationName: 'liquidityPositions',
		variables: {
			address: address,
			skipLimit: skipLimit,
		},
		query: `
    query liquidityPositionSnapshotsQuery($address: String!, $skipLimit: Int!) {
      liquidityPositionSnapshots(where:{user:$address}, first:1000, skip:$skipLimit) {
        timestamp
        pair {
          id
          reserve0
          reserve1
        }
        token0PriceUSD
        token1PriceUSD
        liquidityTokenTotalSupply
        reserveUSD
        reserve0
        reserve1
        liquidityTokenBalance
        liquidityPosition {
          id
        }
      }
    }`,
	};
}

export function getHistoricalLPTokensPricesQuery(
	tokensPricesRequests: TokenPriceRequest[],
): TheGraphQuery {
	let query = '';

	for (const token of tokensPricesRequests) {
		query += `
      tokenAddress_${token.tokenAddress}:
        pairDayDatas (where:{pairAddress:"${token.tokenAddress}", date_in:[${token.timestamps}]}, orderBy:date, orderDirection:desc) {
          date
          pairAddress
          token0 {
            name
            symbol
          }
          token1 {
            name
            symbol
          }
          reserveUSD
          totalSupply
    }`;
	}

	return {
		operationName: 'pairDayDatas',
		variables: {},
		query: `
    query {
      ${query}
    }`,
	};
}

export function getCurrentLPTokensPriceQuery(
	addresses: string[],
	timestamp: number,
): TheGraphQuery {
	return {
		operationName: 'pairDayDatas',
		variables: {
			addresses: addresses,
			timestamp: timestamp,
		},
		query: `
    query pairDayDataQuery($addresses: [String]!, $timestamp: Int!) {
      pairDayDatas (where:{pairAddress_in:$addresses date:$timestamp}, orderBy:date, orderDirection:desc) {
        pairAddress
        token0 {
          name
          symbol
        }
        token1 {
          name
          symbol
        }
        reserveUSD
        totalSupply
      }
    }`,
	};
}

export interface UniswapLiquidityPositionsResponse {
	data: UniswapLiquidityPositions;
}

export interface UniswapLiquidityPositions {
	liquidityPositions: UniswapLiquidityPosition[];
	mints: UniswapMint[];
	burns: UniswapBurn[];
	swapsFrom: UniswapSwap[];
	swapsTo: UniswapSwap[];
	liquidityPositionSnapshots: UniswapLiquidityPositionSnapshot[];
}

export interface UniswapLiquidityPosition {
	liquidityTokenBalance: string;
	pair: UniswapLiquidityPositionPair;
}

export interface UniswapLiquidityPositionPair {
	id: string;
	reserve0: string;
	reserve1: string;
	reserveUSD: string;
	token0: UniswapToken;
	token0Price: string;
	token1: UniswapToken;
	token1Price: string;
	totalSupply: string;
}

export interface UniswapMint {
	transaction: UniswapTransaction;
	amount0: string;
	amount1: string;
	amountUSD: string;
	liquidity: string;
	pair: UniswapMintPair;
}

export interface UniswapMintPair {
	id: string;
	token0: UniswapToken;
	token1: UniswapToken;
}

export interface UniswapBurn {
	transaction: UniswapTransaction;
	amount0: string;
	amount1: string;
	amountUSD: string;
	liquidity: string;
	pair: UniswapBurnPair;
}

export interface UniswapBurnPair {
	id: string;
	token0: UniswapToken;
	token1: UniswapToken;
}

export interface UniswapSwap {
	transaction: UniswapTransaction;
	amount0In: string;
	amount1In: string;
	amount0Out: string;
	amount1Out: string;
	amountUSD: string;
	logIndex: number;
	pair: UniswapSwapPair;
}

export interface UniswapSwapPair {
	id: string;
	token0: UniswapToken;
	token1: UniswapToken;
}

export interface UniswapLiquidityPositionSnapshot {
	timestamp: number;
	token0PriceUSD: string;
	token1PriceUSD: string;
	reserve0: string;
	reserve1: string;
	reserveUSD: string;
	liquidityTokenBalance: string;
	liquidityTokenTotalSupply: string;
	pair: {
		id: string;
	};
}

export interface UniswapToken {
	decimals: string;
	id: string;
	name: string;
	symbol: string;
}

export interface UniswapTransaction {
	id: string;
	timestamp: string;
	blockNumber: string;
}

export interface SushiswapPairDayDatasResponse {
	data: SushiswapPairDayDatas;
}

export interface SushiswapPairDayDatas {
	pairDayDatas: SushiswapPairDayData[];
}

export interface SushiswapPairDayData {
	id: number;
	pairAddress: string;
	date: number;
	token0: UniswapToken;
	token1: UniswapToken;
	reserve0: string;
	reserve1: string;
	reserveUSD: number;
	totalSupply: number;
}
