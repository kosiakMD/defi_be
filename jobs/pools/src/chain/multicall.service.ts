import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '../config/enum';
import { decodeOutput } from '../utils/conventer';
import { concatStrings } from '../utils/string';
import { MulticallContract } from './contract/multicall.contract';
import { CallData } from './dto/call.data';
import { Web3Provider } from './web3.provider';

@Injectable()
export class MulticallService {
  private readonly calls: Map<string, CallData> = new Map<string, CallData>();

  constructor(private readonly provider: Web3Provider) {}

  async handleInBatches(calls: Map<string, CallData>, chain: ChainIdEnum) {
    const multicall: MulticallContract = this.provider.multicall(chain);
    const web3: Web3 = this.provider.web3(chain);

    // todo: filter with existed calls, probably in the other caching class
    // todo: this must be filtered already

    // this map is necessary to have in order to map class calls id to received map ids
    const callLabelToCallIdMap: Map<string, string> = new Map<string, string>();

    // set to map with no duplicates xD)
    calls.forEach((c, k) => {
      c.input.plain = web3.eth.abi.encodeFunctionCall(c.abi, c.input.data);

      const callId = concatStrings(chain, c.address, c.input.plain);

      callLabelToCallIdMap.set(k, callId);
      this.calls.set(callId, c);
    });

    const callsToBeExecuted = [];

    // this indexes using to map multicall result to back request objects
    let i = 0;
    const indexes: { index; key }[] = [];
    for (const [key, value] of this.calls) {
      indexes.push({ index: i++, key: key });
      callsToBeExecuted.push([value.address, value.input.plain]);
    }

    console.log(calls);
    const { returnData } = await multicall.aggregate(callsToBeExecuted);
    console.log(returnData)
    indexes.forEach(({ index, key }) => {
      const callInMap = this.calls.get(key);
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
      calls.set(receivedId, this.calls.get(internalId));
    });

    return calls;
  }
}
