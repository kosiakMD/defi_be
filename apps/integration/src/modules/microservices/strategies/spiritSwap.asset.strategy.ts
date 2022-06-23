import { AbiService } from 'apps/integration/src/framework/support/EVM/AbiModule/AbiService';

import { Injectable } from '@nestjs/common';

import { CallData } from '@app/common/dto/CallData';
import { toChunkedArray } from '@app/common/utils/transform';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { TokenDataStrategy } from './strategy.interface';
import { UniswapV2LpStrategy } from './uniswap.v2.asset.strategy';

const CHUNK_SIZE = 4000;

@Injectable()
export class SpiritSwapStrategy extends UniswapV2LpStrategy implements TokenDataStrategy {
  constructor(protected multicall: MulticallAggregator, protected abiService: AbiService) {
    super(multicall);
  }

  protected async multiCallData(
    calls: Map<any, any>,
    chain: number,
  ): Promise<Map<string, CallData<any>>> {
    const chunks = toChunkedArray(Array.from(calls.entries()), CHUNK_SIZE);
    const resultsCalls = [];
    for (const chunk of chunks) {
      resultsCalls.push(
        ...Array.from((await this.multicall.handleInBatches(new Map(chunk), chain)).entries()),
      );
    }
    return new Map<string, CallData<any>>(resultsCalls);
  }
}
