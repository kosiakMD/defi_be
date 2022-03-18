import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CallData } from '@app/common/dto/CallData';
import { ChainIdEnum, Logger } from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { Web3ProviderService } from '@app/common/web3provider';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class MulticallProxy {

  private cacheKeyCallWeight = 'callweight';

  constructor(private readonly multicallAggregator: MulticallAggregator,
              private readonly provider: Web3ProviderService,
              @Inject(CACHE_MANAGER) private readonly cache: Cache,
              @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
  }

  async handleInBatches(calls: Map<string, CallData>, chain: ChainIdEnum) {

    const cachedCalls = new Map<string, number>();
    for (const [id, c] of calls) {
      const signatureUnique = this.cacheKeyCallWeight + ':' + ChainIdToAbbr[chain] + ':' + c.address + ':' + c.abi.name + ':' + c.abi.inputs.length;
      let callGasEstimated = cachedCalls.get(signatureUnique);
      if (!callGasEstimated) {
        callGasEstimated = await this.cache.get<number>(signatureUnique);
        if (callGasEstimated) {
          cachedCalls.set(signatureUnique, callGasEstimated);
        }
      }
      if (!callGasEstimated) {
        callGasEstimated = await this.estimateGas(c, chain);
        await this.cache.set(signatureUnique, callGasEstimated)
      }
      c.gas = callGasEstimated;
    }

    let gasLimitCurrent = 0;
    let maxGasLimit = 50000000;

    const callsChunks = [];
    let chunkedCalls = new Map<string, CallData>();
    for (const [id, c] of calls) {
      if (gasLimitCurrent > maxGasLimit) {
        gasLimitCurrent = 0;
        callsChunks.push(chunkedCalls);
        chunkedCalls = new Map<string, CallData>();
      }

      chunkedCalls.set(id, c);
      gasLimitCurrent += c.gas;
    }
    if (chunkedCalls.size > 0) {
      callsChunks.push(chunkedCalls);
    }
    const sizes = [];
    callsChunks.forEach((cc) => {
      sizes.push(cc.size);
    })
    this.logger.debug(`${MulticallProxy.name}.handleInBatches input splitted from ${calls.size} to [${sizes.join(',')}]`);

    const result = new Map<string, CallData>();
    for (const callsChunk of callsChunks) {
      // try {
        const chunkRes: Map<string, CallData> = await this.multicallAggregator.handleInBatches(callsChunk, chain);
        chunkRes.forEach((cd, key) => {
          result.set(key, cd);
        })

      // } catch (e) {
      //   let debugNumber = 0;
      //   for (const [id, c] of callsChunks) {
      //     console.log('debug');
      //     const r = await this.multicallAggregator.handleInBatches(new Map<string, CallData>([id, c]), chain);
      //     console.log(r)
      //     console.log('finished ' + ++debugNumber)
      //   }
      // }
    }

    return result;
  }

  private async estimateGas(call: CallData, chain: ChainIdEnum) {

    const web3 = this.provider.getInstanceByChainId(chain);
    const encodedInput = web3.eth.abi.encodeFunctionCall(call.abi, call.input.data ? call.input.data : [])

    const estimatedGas = await web3.eth.estimateGas({
      to: call.address,
      data: encodedInput
    });
    // simulation of multicall wrapper
    return Math.round(estimatedGas * 1.1);
  }
}
