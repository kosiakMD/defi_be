import BigNumber from 'bignumber.js';
import { isAddress as isETHAddress } from 'web3-utils';

import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { COIN_ADDRESS } from '@app/common/constant';
import { retry } from '@app/common/utils/retry';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { Web3Provider } from '../../../common/providers/chainRelated/web3.provider';
import { BalancesRequest } from '../../../common/types';
import { chunkArray, insertAtPosition } from '../../../common/utils';

import { TokenBalance } from '../balances.interfaces';
import { BalancesContract } from '../contracts/balances.contract';

const DEFAULT_BATCH_SIZE = 1000;
const WEB3_RETRY_CALL_IN_MS = 2000;

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
    block,
  }: BalancesRequest): Promise<TokenBalance[]> {
    const web3 = this.web3Provider.getInstanceByChainId(chainId);
    if (!originalTokens.length || !isETHAddress(address)) {
      return [];
    }

    const message = `Network balances loading for address ${address} and chain ${chainId}  at block ${
      block?.block ?? "'latest'"
    }`;
    this.logger.time(message);

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

    const chunkSize = this.getBalancesBatchSize(chainId);
    let promises: (Promise<string> | Promise<string[]>)[] = chunkArray(tokens, chunkSize).map(
      (chunk) => retry(() => contract.getBalances(address, chunk, block), WEB3_RETRY_CALL_IN_MS),
    );

    if (hasNativeCoin) {
      promises = [retry(() => web3.eth.getBalance(address), WEB3_RETRY_CALL_IN_MS), ...promises];
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
      case ChainIdEnum.gnosis:
        return this.config.get<string>('GNOSIS_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.harm:
        return this.config.get<string>('HARMONY_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.celo:
        return this.config.get<string>('CELO_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.mriver:
        return this.config.get<string>('MOONRIVER_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.heco:
        return this.config.get<string>('HECO_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.okex:
        return this.config.get<string>('OKEX_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.cro:
        return this.config.get<string>('CRONOS_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.kcc:
        return this.config.get<string>('KCC_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.boba:
        return this.config.get<string>('BOBA_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.near:
        return this.config.get<string>('NEAR_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.klay:
        return this.config.get<string>('KLAYTN_BALANCES_CHECKER_ADDRESS');
      case ChainIdEnum.fuse:
        return this.config.get<string>('FUSE_BALANCES_CHECKER_ADDRESS');
    }
  }

  private getBalancesBatchSize(chain: ChainIdEnum): number {
    switch (chain) {
      case ChainIdEnum.eth:
        return this.config.get<number>('ETH_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.bsc:
        return this.config.get<number>('BSC_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.plg:
        return this.config.get<number>('POLYGON_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.ftm:
        return this.config.get<number>('FTM_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.avax:
        return this.config.get<number>('AVAX_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.arbi:
        return this.config.get<number>('ARBITRUM_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.gnosis:
        return this.config.get<number>('GNOSIS_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.celo:
        return this.config.get<number>('CELO_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.mriver:
        return this.config.get<number>('MOONRIVER_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.harm:
        return this.config.get<number>('HARMONY_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.heco:
        return this.config.get<number>('HECO_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.okex:
        return this.config.get<number>('OKEX_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.cro:
        return this.config.get<number>('CRONOS_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.boba:
        return this.config.get<number>('BOBA_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.kcc:
        return this.config.get<number>('KCC_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.opt:
        return this.config.get<number>('OPTIMISM_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.near:
        return this.config.get<number>('NEAR_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.klay:
        return this.config.get<number>('KLAYTN_BALANCES_CHECKER_BATCH_SIZE');
      case ChainIdEnum.fuse:
        return this.config.get<number>('FUSE_BALANCES_CHECKER_BATCH_SIZE');
      default:
        return DEFAULT_BATCH_SIZE;
    }
  }
}
