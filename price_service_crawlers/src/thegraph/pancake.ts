import { TokenPriceRequest } from '../models/prices';
import { TheGraphQuery } from './query';

export function getPancakePoolsQuery(skip): TheGraphQuery {
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

export function firstDailyBlockPairs(blockNumber: number, token: string): TheGraphQuery {
  return {
    operationName: 'getFirstBlockTimestamp',
    variables: {
      blockNumber: blockNumber,
      token: token,
    },
    query: `
    query firstQuery {
      pairs: 
        pairs (block:{number:${blockNumber}},where:{id_in:
          ["${token}"]}) {
          id
          reserveUSD
          totalSupply
        }
    }`,
  };
}

export function getPancakeCurrentPriceQuery(address: string): TheGraphQuery {
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

export interface PancakeLiquidityPosition {
  liquidityTokenBalance: string;
  pair: PancakeLiquidityPositionPair;
}

export interface PancakeLiquidityPositionPair {
  id: string;
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  token0: PancakeToken;
  token0Price: string;
  token1: PancakeToken;
  token1Price: string;
  totalSupply: string;
}

export interface PancakeToken {
  decimals: string;
  id: string;
  name: string;
  symbol: string;
}

export interface PancakeTransaction {
  id: string;
  timestamp: string;
  blockNumber: string;
}

export interface PancakePairDayDatasResponse {
  data: PancakePairDayDatas;
}

export interface PancakePairDayDatas {
  pairDayDatas: PancakePairDayData[];
}

export interface PancakePairDayData {
  id: number;
  pairAddress: string;
  date: number;
  token0: PancakeToken;
  token1: PancakeToken;
  reserve0: string;
  reserve1: string;
  reserveUSD: number;
  totalSupply: number;
}
