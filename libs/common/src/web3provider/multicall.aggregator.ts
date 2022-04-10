import { Injectable } from '@nestjs/common';

import { CallData } from '../dto/CallData';
import { concatStrings, decodeOutput } from '../utils';
import { ChainIdEnum } from '../enum';
import { Web3ProviderService } from './web3.provider.service';

@Injectable()
export class MulticallAggregator {
  constructor(private readonly provider: Web3ProviderService) {}

  async handleInBatches<T = any>(
    calls: Map<string, CallData>,
    chain: ChainIdEnum,
  ): Promise<Map<string, CallData<T>>> {
    const multicall = this.provider.getMulticallByChainId(chain);
    const web3 = this.provider.getInstanceByChainId(chain);

    const callsMap: Map<string, CallData> = new Map<string, CallData>();

    // this map is necessary to have in order to map class calls id to received map ids
    const callLabelToCallIdMap: Map<string, string> = new Map<string, string>();

    // set to map with no duplicates xD)
    calls.forEach((c, k) => {
      c.input.plain = web3.eth.abi.encodeFunctionCall(c.abi, c.input.data ? c.input.data : []);

      const callId = concatStrings(chain, c.address, c.input.plain);

      callLabelToCallIdMap.set(k, callId);
      callsMap.set(callId, c);
    });

    const callsToBeExecuted = [];

    // this indexes using to map multicall result to back request objects
    let i = 0;
    const indexes: { index; key }[] = [];
    for (const [key, value] of callsMap) {
      indexes.push({ index: i++, key: key });
      callsToBeExecuted.push([value.address, value.input.plain]);
    }

    const { returnData } = await multicall.aggregate(callsToBeExecuted);

    indexes.forEach(({ index, key }) => {
      const callInMap = callsMap.get(key);
      callInMap.output.plain = returnData[index];
      const outputResult = web3.eth.abi.decodeParameters(
        callInMap.abi.outputs,
        callInMap.output.plain,
      );
      callInMap.output.data = decodeOutput(callInMap.abi, outputResult);
    });

    // create response with given ids
    calls = new Map<string, CallData>();
    callLabelToCallIdMap.forEach((internalId, receivedId) => {
      calls.set(receivedId, callsMap.get(internalId));
    });

    return calls;
  }

  async call(call: CallData, chain: ChainIdEnum) {
    const results = await this.handleInBatches(new Map([['single-call', call]]), chain);
    return results.get('single-call').output.data;
  }

  private key(call: CallData): string {
    return `${call.address}_${call.abi.name}_${JSON.stringify(call.input.data)}`;
  }

  async callArray(calls: CallData[], chain: ChainIdEnum): Promise<any[]> {
    const callMap = new Map<string, CallData>();
    calls.forEach((call) => {
      callMap.set(this.key(call), call);
    });
    const resultsMap = await this.handleInBatches(callMap, chain);
    const results = [];
    calls.forEach((call) => {
      results.push(resultsMap.get(this.key(call)).output.data);
    });
    return results;
  }

  web3(chain) {
    return this.provider.getInstanceByChainId(chain);
  }
}
