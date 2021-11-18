import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { TokenBalance } from '../../interfaces/balance.interfaces';
import { BalancesLoadingStrategy, BalancesRequest } from '../index';

@Injectable()
export class SolanaBalancesStrategy implements BalancesLoadingStrategy {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
    block,
  }: BalancesRequest): Promise<TokenBalance[]> {
    console.log('getting colana balances for ' + address);
    return [];
  }
}
