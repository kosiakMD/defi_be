import { LoggerService } from '@nestjs/common';

import { BalancesLoadingStrategy } from '../../common/interfaces';
import { BalancesRequest } from '../../common/types';

import { TokenBalance } from './balances.interfaces';

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
  } catch (error: any) {
    logger?.error(
      `Error loading balances for chain ${request.chainId}, address ${request.address}. Error: ${error}`,
    );
    return {
      success: false,
      error,
    };
  }
}
