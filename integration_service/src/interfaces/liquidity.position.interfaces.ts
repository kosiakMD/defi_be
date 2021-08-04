import { DirectionEnum, TransactionTypeEnum } from '../common/enum';
import { UniswapToken } from './entity.information.interfaces';
import {
  ERC20Token,
  LiquidityChangeTransaction,
  PoolToken,
  SwapToken,
  SwapTransaction,
  Transaction,
} from './transactions.interfaces';

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

export interface LiquidityPool {
  address: string;
  name?: string;
}

export interface UniswapLiquidityPosition {
  liquidityTokenBalance: string;
  user: string;
  pair: UniswapLiquidityPositionPair;
}

export interface TransferTransaction extends Transaction {
  type: TransactionTypeEnum.transfer;
  direction: DirectionEnum;
  token: SwapToken[];
}

export type AMMTransaction = LiquidityChangeTransaction | SwapTransaction | TransferTransaction;

export interface LiquidityPosition {
  lpToken: ERC20Token;
  pool?: LiquidityPool;
  lpTokenBalance: string;
  exitedAt?: number;
  earnedFeeUSD?: number;
  poolTokens: PoolToken[];
  transactions?: AMMTransaction[];
  project?: string;
}

export interface LiquidityPositionResponseData {
  data: {
    liquidityPositions: UniswapLiquidityPosition[];
  };
}
