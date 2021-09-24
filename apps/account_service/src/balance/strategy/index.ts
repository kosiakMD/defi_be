import { LoggerService } from '@nestjs/common';

import { Address, ChainIdEnum } from '@app/common';

import { TokenBalance } from '../interfaces/balance.interfaces';

export type BalancesRequest = {
  address: Address;
  chainId: ChainIdEnum;
  tokens: Address[];
};

export interface BalancesLoadingStrategy {
  getBalances(request: BalancesRequest): Promise<TokenBalance[]>;
}

export async function getBalancesSafe(
  strategy: BalancesLoadingStrategy,
  request: BalancesRequest,
  logger?: LoggerService,
): Promise<{
  success: boolean;
  error?: Error;
  balances?: TokenBalance[];
}> {
  try {
    return {
      success: true,
      balances: await strategy.getBalances(request),
    };
  } catch (error) {
    logger?.error(
      `Error loading balances for chain ${request.chainId}, address ${request.address}. Error: ${error}`,
    );
    return {
      success: false,
      error,
    };
  }
}
