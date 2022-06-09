/* eslint-disable prettier/prettier */
import BigNumber from 'bignumber.js';
import { isAddress as isETHAddress } from 'web3-utils';

import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { COIN_ADDRESS } from '@app/common/constant';
import { retry } from '@app/common/utils/retry';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { Web3Provider } from '../../../common/providers/chainRelated/web3.provider';
import { BaseBalanceStrategy } from '../../../common/services/base-balance.strategy';
import { BalancesRequest } from '../../../common/types';
import { chunkArray, insertAtPosition } from '../../../common/utils';

import { ChainsService } from '../../chains/chains.service';
import { TokenBalance } from '../balances.interfaces';
import { BalancesContract } from '../contracts/balances.contract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { BALANCES_ABI } from '../contracts/balances.contract.abi';
import { CallData } from '@app/common/dto/CallData';
import { BALANCE_OF_ABI } from '../contracts/balance-of.abi';

export class NetworkBalancesStrategy
  extends BaseBalanceStrategy
  implements BalancesLoadingStrategy
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
    private readonly chainsService: ChainsService,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  private readonly DEFAULT_BATCH_SIZE = 1000;
  private readonly WEB3_RETRY_CALL_IN_MS = 2000;
  private readonly COMMON_BALANCE_CHECKER_ADDRESS = '0x1861eb1cc764032509e4d2ff545138be0ad3b240';

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
    block,
  }: BalancesRequest): Promise<TokenBalance[]> {
    const web3 = await this.web3Provider.getInstanceByChainId(chainId);
    if (!originalTokens.length || !isETHAddress(address)) {
      return [];
    }

    const message = `Network balances loading for address ${address} and chain ${chainId}  at block ${
      block?.block ?? "'latest'"
    }`;
    this.logger.time(message);

    const contractAddress = await this.getBalancesContractAddress(chainId);
    if (!contractAddress) {
      throw new Error(`No balances checker contract for ${chainId} chain`);
    }

    // const contract = new BalancesContract(contractAddress, web3);
    const contract = new DynamicContract(contractAddress);

    let tokens = [...originalTokens];
    const nativeCoinIndex = tokens.indexOf(COIN_ADDRESS);
    const hasNativeCoin = nativeCoinIndex >= 0;
    if (hasNativeCoin) {
      tokens.splice(nativeCoinIndex, 1);
    }

    let promises: CallData[]/*Promise<string | string[]>[]*/ = chunkArray(tokens, this.DEFAULT_BATCH_SIZE).map(
      (chunk) =>
        // retry(() => contract.getBalances(address, chunk, block), this.WEB3_RETRY_CALL_IN_MS),
        contract.createCall(BALANCES_ABI.pop(), address, chunk)
    );

    if (hasNativeCoin) {
      promises = [
        contract.createCall(BALANCE_OF_ABI, address),
        // retry(() => web3.eth.getBalance(address), this.WEB3_RETRY_CALL_IN_MS),
        ...promises,
      ];
    }

    const batchedBalances = await this.multicall.callArray(
      promises,
      1,
      false,
    )//await Promise.all<string | string[]>(promises);

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

  private async getBalancesContractAddress(chain: number): Promise<string> {
    const chainEntity = await this.chainsService.get({ id: chain });
    if (chainEntity?.metadata?.balancesCheckerAddress) {
      return chainEntity.metadata.balancesCheckerAddress;
    }
    return this.COMMON_BALANCE_CHECKER_ADDRESS;
  }
}

