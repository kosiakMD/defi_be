import { TheGraphQuery } from "./query";

export function firstTxTimestamp(): TheGraphQuery {
  return {
    operationName: 'getFirstTimestamp',
    variables: {},
    query: `
    query firstQuery {
      transactions: 
        transactions (first:1, orderBy:timestamp, orderDirection:asc) {
          id
          block
          timestamp
        }
    }`
  }
}

export function firstBlockAfterTimestamp(timestamp: number): TheGraphQuery {
  return {
    operationName: 'getFirstBlockTimestamp',
    variables: {
      "timestamp": timestamp
    },
    query: `
    query firstQuery {
      blocks: 
        transactions(first: 1, orderBy: block, orderDirection: asc, where:
          {timestamp_gt: ${timestamp}}) {
          block
        }
    }`
  }
}


export function firstDailyBlockPairs(block_number: number, token: string): TheGraphQuery {
  return {
    operationName: 'getFirstBlockTimestamp',
    variables: {
      "block_number": block_number,
      "token": token
    },
    query: `
    query firstQuery {
      pools: 
        pools (block:{number:${block_number}},where:{id_in:
          ["${token}"]}) {
            id
            totalShares
              tokens {
                id
                symbol
                name
                balance
              }
        }
    }`
  }
}


export function getBalancerPoolsQuery(): TheGraphQuery {
  return {
    operationName: 'getPairs',
    variables: {},
    query: `query 
    checkTopPoolsDataQuery {
      pools: pools (first:1000, skip:0) {
            id
            totalShares
            tokens {
              id
              symbol
              name
              balance
            }
        
      }
    }`
  }
}



export function getLiquidityPositionsQuery(address: string): TheGraphQuery {
  return {
    operationName: 'liquidityPositions',
    variables: {
      address: address
    },
    query: `
    query liquidityPositionQuery($address: String!) {
      poolShares(where:{user:$address}, first:1000) {
        balance
        pool {
          id
          name
          symbol
          liquidity
          totalShares
          swapFee
          totalSwapFee
          totalSupply
          totalWeight
          tokens {
            id
            address
            name
            symbol
            decimals
            balance
            denormWeight
          }
        }
      }
      mints(where:{user:$address}, first:1000) {
        tx {
          hash
          event
          block
          timestamp
          gasUsed
          gasPrice
          amount
        }
        amount
        pool {
          id
          name
          symbol
          liquidity
          totalShares
          tokens {
            id
            address
            name
            symbol
            decimals
            balance
            denormWeight
          }
        }
      }
      burns(where:{user:$address}, first:1000) {
        tx {
          hash
          event
          block
          timestamp
          gasUsed
          gasPrice
          amount
        }
        amount
        pool {
          id
          name
          symbol
          liquidity
          totalShares
          tokens {
            id
            address
            name
            symbol
            decimals
            balance
            denormWeight
          }
        }
      }
      swaps(where:{caller:$address}, first:1000) {
        tx {
          id
          hash
          event
          block
          timestamp
          gasUsed
          gasPrice
          amount
        }
        tokenIn
        tokenAmountIn
        tokenInSym
        tokenInName
        tokenInDecimals
        tokenOut
        tokenAmountOut
        tokenOutSym
        tokenOutName
        tokenOutDecimals
        value
        pool {
          tokens {
            id
            address
            name
            symbol
            decimals
            balance
            denormWeight
          }
        }
      }
      proxySwaps: swaps(where:{user:$address,caller:"0x3e66b66fd1d0b02fda6c811da9e0547970db2f21"}, first:1000) {
        tx {
          id
          hash
          event
          block
          timestamp
          gasUsed
          gasPrice
          amount
        }
        tokenIn
        tokenAmountIn
        tokenInSym
        tokenInName
        tokenInDecimals
        tokenOut
        tokenAmountOut
        tokenOutSym
        tokenOutName
        tokenOutDecimals
        value
        pool {
          tokens {
            id
            address
            name
            symbol
            decimals
            balance
            denormWeight
          }
        }
      }
    }`
  }
}

export interface BalancerPoolsTokensResponse {
  totalShares: string;
  id: string;
  tokens: BalancerToken[]
}

export interface BalancerToken {
  id: string;
  symbol: string;
  name: string;
  balance: string;
}

export interface BalancerLiquidityPositionsResponse {
  data: BalancerLiquidityPositions;
}

export interface BalancerLiquidityPositions {
  poolShares: BalancerPoolShare[];
  mints: BalancerMint[];
  burns: BalancerBurn[];
  swaps: BalancerSwap[];
  proxySwaps: BalancerSwap[];
}

export interface BalancerPoolShare {
  balance: string;
  pool: BalancerPool;
}

export interface BalancerPool {
  id: string;
  name: string;
  symbol: string;
  liquidity: string;
  totalShares: string;
  totalSupply: string;
  tokens: BalancerToken[];
  totalWeight: string
  swapFee,
  totalSwapFee
}

export interface BalancerToken {
  id: string;
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  totalSupply: string;
  balance: string;
  denormWeight: string;
}

export interface BalancerMint {
  tx: BalancerTransaction;
  amount: string;
  pool: BalancerPool;
}

export interface BalancerBurn {
  tx: BalancerTransaction;
  amount: string;
  pool: BalancerPool;
}

export interface BalancerSwap {
  tx: BalancerTransaction;
  tokenIn: string;
  tokenAmountIn: string;
  tokenInSym: string;
  tokenInName: string;
  tokenInDecimals: string;
  tokenOut: string;
  tokenAmountOut: string;
  tokenOutSym: string;
  tokenOutName: string;
  tokenOutDecimals: string;
  value: string;
  pool: BalancerPool;
}

export interface BalancerTransaction {
  hash: string;
  id: string
  event: string;
  block: string;
  timestamp: string;
  gasUsed: string;
  gasPrice: string;
  amount: string;
}
