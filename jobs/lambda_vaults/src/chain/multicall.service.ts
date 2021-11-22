import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';

import { decodeOutput } from '../utils/conventer';
import { concatStrings } from '../utils/string';
import { MulticallContract } from './contract/multicall.contract';
import { CallData } from './dto/call.data';
import { Web3Provider } from './web3.provider';

@Injectable()
export class MulticallService {
  constructor(private readonly provider: Web3Provider) {}

  async handleInBatches(calls: Map<string, CallData>, chain: ChainIdEnum) {
    const multicall: MulticallContract = this.provider.multicall(chain);
    const web3: Web3 = this.provider.web3(chain);

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
}
