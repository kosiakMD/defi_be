import { AmountAble, Base, ERC20Token, PoolToken, PriceAble, Transaction } from './common';

export interface SwapToken extends ERC20Token, AmountAble, PriceAble {}

export interface LiquidityChangeTransaction extends Transaction {
  type: 'addLiquidity' | 'removeLiquidity';
  lpTokenAddress: string;
  liquidity: string;
  amountUSD?: number;
  tokens: PoolToken[];
}

export interface SwapTransaction extends Transaction {
  type: 'swap';
  tokenIn: SwapToken;
  tokenOut: SwapToken;
}

export interface TransferTransaction extends Transaction {
  type: 'transfer';
  direction: 'in' | 'out';
  token: SwapToken[];
}

type AMMTransaction = LiquidityChangeTransaction | SwapTransaction | TransferTransaction;

export interface LiquidityPool {
  address: string;
  name?: string;
}

export interface LiquidityPosition {
  lpToken: ERC20Token;
  pool?: LiquidityPool;
  lpTokenBalance: string;
  exitedAt: number;
  earnedFeeUSD?: number;
  poolTokens: PoolToken[];
  transactions?: AMMTransaction[];
}

export interface AutomaticMarketMaker extends Base<'amm'> {
  isTransferSupported?: boolean;
  liquidityPositions: LiquidityPosition[];
}
