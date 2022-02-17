import { Coins } from '@terra-money/terra.js';

import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { Web3Provider } from '../../../common/providers/chainRelated/web3.provider';
import { BalancesRequest } from '../../../common/types';

import { TokenBalance } from '../balances.interfaces';

export class TerraBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly web3Provider: Web3Provider,
  ) {}

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
    block,
  }: BalancesRequest): Promise<TokenBalance[]> {
    const tokenBalances: TokenBalance[] = [];
    if (!originalTokens.length || !address.match(/^terra.*/)) {
      return [];
    }

    const nativeTokens = originalTokens.filter((ot) => ot.match(/^u([a-z])+/));
    const customTokens = originalTokens.filter((ot) => ot.match(/^terra.*/));
    const nativeTokensSet = new Set(nativeTokens);

    const terra = this.web3Provider.getInstanceByChainId(chainId);
    const nativeTokensBalancesResult = await terra.bank.balance(address);
    const nativeTokensBalances: Coins = nativeTokensBalancesResult[0];
    nativeTokensBalances.map((tb) => {
      if (nativeTokensSet.has(tb.denom) && tb.amount.toNumber() > 0) {
        tokenBalances.push({
          token: {
            chainId: chainId,
            address: tb.denom,
          },
          amount: tb.amount.toString(),
        });
      }
    });

    const customTokenBalances = await Promise.allSettled(
      customTokens.map((ct) => {
        return terra.wasm.contractQuery(ct, { balance: { address: address } }) as Promise<{
          balance: string;
        }>;
      }),
    );
    for (const key in customTokenBalances) {
      const queryResult = customTokenBalances[key];
      if (queryResult.status === 'fulfilled' && Number(queryResult.value.balance) > 0) {
        tokenBalances.push({
          token: {
            chainId: chainId,
            address: customTokens[key],
          },
          amount: queryResult.value.balance,
        });
      }
    }

    const message = `Network balances loading for address ${address} and chain ${chainId}  at block ${
      block?.block ?? "'latest'"
    }`;
    this.logger.time(message);

    return tokenBalances;
  }
}
