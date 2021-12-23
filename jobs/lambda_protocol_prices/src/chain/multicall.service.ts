import { Injectable } from '@nestjs/common';

import { concatStrings } from '@app/common/utils';
import { decodeOutput } from '@app/common/utils/multicall';

import { CallData } from './dto/call.data';
import { Web3Provider } from './web3.provider';

@Injectable()
export class MulticallService {
  constructor(private readonly provider: Web3Provider) {}

  async handleInBatches(calls: Map<string, CallData>) {
    const callsMap: Map<string, CallData> = new Map<string, CallData>();

    // this map is necessary to have in order to map class calls id to received map ids
    const callLabelToCallIdMap: Map<string, string> = new Map<string, string>();

    // set to map with no duplicates xD)
    calls.forEach((c, k) => {
      c.input.plain = this.provider.web3.eth.abi.encodeFunctionCall(c.abi, c.input.data || []);

      const callId = concatStrings(c.address, c.input.plain);

      callLabelToCallIdMap.set(k, callId);
      callsMap.set(callId, c);
    });

    const callsToBeExecuted = [];

    // this indexes using to map multicall result to back request objects
    let i = 0;
    const indexes: { index; key }[] = [];
    callsMap.forEach((value, key) => {
      indexes.push({ index: i++, key: key });
      callsToBeExecuted.push([value.address, value.input.plain]);
    });

    const { returnData } = await this.provider.multicall.aggregate(callsToBeExecuted);

    indexes.forEach(({ index, key }) => {
      const callInMap = callsMap.get(key);
      callInMap.output.plain = returnData[index];
      const outputResult = this.provider.web3.eth.abi.decodeParameters(
        callInMap.abi.outputs,
        callInMap.output.plain,
      );
      callInMap.output.data = decodeOutput(callInMap.abi, outputResult);
    });

    // create response with given ids
    const response = new Map<string, CallData>();
    callLabelToCallIdMap.forEach((internalId, receivedId) => {
      response.set(receivedId, callsMap.get(internalId));
    });

    return response;
  }

  async call(call: CallData) {
    const results = await this.handleInBatches(new Map([['single-call', call]]));
    return results.get('single-call').output.data;
  }
}
