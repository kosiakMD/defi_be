import BigNumber from 'bignumber.js';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { COIN_ADDRESS } from '@app/common/constant';

import { Web3Provider } from '../../../chain/web3.provider';
import { TokenBalance } from '../../interfaces/balance.interfaces';
import { BalancesLoadingStrategy, BalancesRequest } from '../index';
import { BalancesContract } from './balances.contract';
import { chunkArray, insertAtPosition } from './utils';

@Injectable()
export class NetworkBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly web3Provider: Web3Provider,
  ) {}

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
  }: BalancesRequest): Promise<TokenBalance[]> {
    if (!originalTokens.length) {
      return [];
    }

    const message = `Network balances loading for address ${address} and chain ${chainId}`;
    this.logger.time(message);

    const web3 = await this.web3Provider.getInstanceByChainId(chainId);
    const contractAddress = this.getBalancesContractAddress(chainId);
    if (!contractAddress) {
      throw new Error(`No balances checker contract for ${chainId} chain`);
    }

    const contract = new BalancesContract(contractAddress, web3);

    let tokens = [...originalTokens];
    const nativeCoinIndex = tokens.indexOf(COIN_ADDRESS);
    const hasNativeCoin = nativeCoinIndex >= 0;
    if (hasNativeCoin) {
      tokens.splice(nativeCoinIndex, 1);
    }

    const chunkSize = this.config.get<number>('BALANCES_CHECKER_BATCH_SIZE');
    let promises: (Promise<string> | Promise<string[]>)[] = chunkArray(tokens, chunkSize).map(
      (chunk) => contract.getBalances(address, chunk),
    );

    if (hasNativeCoin) {
      promises = [web3.eth.getBalance(address), ...promises];
    }

    const batchedBalances = await Promise.all<string | string[]>(promises);

    let balances: string[];

    if (hasNativeCoin) {
      const [coinBalance, ...tokenBalances] = batchedBalances;
      balances = tokenBalances.flat();
      tokens = insertAtPosition(tokens, nativeCoinIndex, COIN_ADDRESS);
      balances = insertAtPosition(balances, nativeCoinIndex, coinBalance as string);
    } else {
      balances = batchedBalances.flat();
    }

    const results = balances
      .map((balance, index) => ({
        token: {
          chainId: chainId,
          address: tokens[index],
        },
        amount: balance,
      }))
      .filter(({ amount }) => new BigNumber(amount).gt(0));

    this.logger.timeEnd(message);

    return results;
  }

  private getBalancesContractAddress(chain: ChainIdEnum): string {
    switch (chain) {
      case ChainIdEnum.eth:
        return this.config.get<string>('ETH_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.bsc:
        return this.config.get<string>('BSC_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.plg:
        return this.config.get<string>('POLYGON_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.ftm:
        return this.config.get<string>('FTM_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.avax:
        return this.config.get<string>('AVAX_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.arbi:
        return this.config.get<string>('ARBITRUM_BALANCES_CHECKER_ADDRESS');
    }
  }
}
