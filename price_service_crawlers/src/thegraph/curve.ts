import { TheGraphQuery } from './query';

export function getCurvePoolsQuery(): TheGraphQuery {
	return {
		operationName: 'poolsTokens',
		variables: {},
		query: `
    query poolsTokens {
      {
        pairs (first:1000, skip:0) {
        id
        }
      }
    }`,
	};
}

export function getCurveLiquidityPositionsQuery(address: string): TheGraphQuery {
	return {
		operationName: 'liquidityPositions',
		variables: {
			address: address,
		},
		query: `
    query liquidityPositionQuery($address: String!) {
      liquidityPositions (where:{user:$address}) {
        id
        user
        pool {
          id
        }
        poolTokenBalance
        gaugeStakedBalance
        minted
      }
      depositPositions (where:{user:$address}) {
        user {
          id
        }
        depositedBalance
        totalDeposited
        totalWithdrawn
      }
      # mints
      addLiquidityEvents (where:{user:$address}) {
       transaction {
        id
        block
        timestamp
       }
       pool {
         id
       }
       tokenAmounts
       invariant
       mintedSupply
      }
      # burns one
      removeLiquidityOneEvents (where:{user:$address}) {
        transaction {
         id
         block
         timestamp
        }
        pool {
         id
        }
        lpTokenAmount
        swapTokenAmount
      }
      # burns many
      removeLiquidityEvents (where:{user:$address}) {
        transaction {
          id
          block
          timestamp
        }
        pool {
          id
        } 
        tokenAmounts
        burnedSupply
      }
      stakes: lptokenTransfers (where:{type:2, from:$address}) {
       transaction {
         id
         block
         timestamp
       }
       token {
         id
       }
       to {
        id
       }
       value
       virtualPrice
      }
      # unstakes
      unStakes: lptokenTransfers (where:{type:3, to:$address}) {
       transaction {
         id
         block
         timestamp
       }
       token {
         id
       }
       from {
        id
       }
       value
       virtualPrice
      }
      # mints from gauges
      mintEvents (where:{recipient:$address}) {
        transaction {
          id
          block
          timestamp
        }
        gauge
        minted
      }
    }`,
	};
}

export function getCurveSwapsQuery(address: string): TheGraphQuery {
	return {
		operationName: 'liquidityPositions',
		variables: {
			address: address,
		},
		query: `
      query swaps($address: String!) {
        tokenExchangeEvents (where:{buyer:$address}) {
          id
          isUnderlying
          transaction {
            id
            block
            timestamp
          }
          from
          buyer
          pool {
            id
          }
          soldTokenId
          soldAmount
          buyTokenId
          buyAmount
        }
      }
    `,
	};
}

export interface CurvePoolsTokensResponse {
	data: CurvePoolsTokens;
}

export interface CurvePoolsTokens {
	pools: CurvePool[];
	tokens: Token[];
}

export interface CurveSwapsResponse {
	data: CurveSwaps;
}

export interface CurveSwaps {
	tokenExchangeEvents: TokenExchangeEvent[];
}

export interface TokenExchangeEvent {
	id: string;
	isUnderlying: number;
	transaction: {
		id: string;
		block: string;
		timestamp: string;
	};
	from: string;
	buyer: string;
	pool: {
		id: string;
	};
	soldTokenId;
	soldAmount;
	buyTokenId;
	buyAmount;
}

export interface CurveDataResponse {
	data: CurveData;
}

export interface CurveData {
	liquidityPositions: CurveLiquidityPosition[];
	depositPositions: DepositPosition[];
	addLiquidityEvents: AddLiquidityEvent[];
	removeLiquidityEvents: RemoveLiquidityEvent[];
	removeLiquidityLpTokenTransfers: LpTokenTransfer[];
	removeLiquidityOneEvents: RemoveLiquidityOneEvent[];
	toUserTransfers: LpTokenTransfer[];
	stakes: StakeChangeEvent[];
	unStakes: StakeChangeEvent[];
	mintEvents: MintEvent[];
}

export interface CurvePool {
	id: string;
	name: string;
	balances: string[];
	assignedCoins: string;
	assignedUnderlyingCoins: string;
	coinCount: string;
	stakingPool: string;
	coins: Token[];
	underlyingCoins: Token[];
	swapCoins: Token[];
	poolToken: Token;
	poolTokenSupply: string;
	virtualPrice: number;
}

export interface Token {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
}

export interface CurveLiquidityPosition {
	user: string;
	pool: {
		id: string;
	};
	poolTokenBalance: string;
	gaugeStakedBalance: string;
	minted: string;
}

export interface DepositPosition {
	id: string;
	user: {
		id: string;
	};
	depositedBalance: string;
	totalDeposited: string;
	totalWithdrawn: string;
}

export interface AddLiquidityEvent {
	id: string;
	pool: {
		id: string;
		name: string;
		poolToken: {
			id: string;
			decimals: string;
		};
		coins: {
			name: string;
		}[];
	};
	transaction: {
		id;
		timestamp: string;
		block: string;
	};
	tokenAmounts: string[];
	invariant: string;
	mintedSupply: string;
}

export interface LpTokenTransfer {
	id: string;
	token: {
		id: string;
	};
	transaction: {
		id: string;
	};
	value: string;
}

export interface RemoveLiquidityEvent {
	transaction: {
		id: string;
		block: string;
		timestamp: string;
	};
	pool: {
		id: string;
	};
	tokenAmounts: string[];
}

export interface RemoveLiquidityOneEvent {
	transaction: {
		id: string;
		block: string;
		timestamp: string;
	};
	pool: {
		id: string;
	};
	lpTokenAmount: string;
	swapTokenAmount: string;
}

export interface StakeChangeEvent {
	transaction: {
		id: string;
		block: string;
		timestamp: string;
	};
	token: {
		id: string;
	};
	from: {
		id: string;
	};
	to: {
		id: string;
	};
	value: string;
	virtualPrice: string;
}

export interface MintEvent {
	transaction: {
		id: string;
		block: number;
		timestamp: number;
	};
	gauge: string;
	minted: number;
}
