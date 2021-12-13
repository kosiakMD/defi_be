import Web3 from 'web3';

import { concatStrings } from '@app/common/utils';

import { CallData } from '../../../common/dto/call.dto';

import { MulticallAbi } from './contracts/multicall.abi';
import { decodeOutput } from './helpers/decoder';

export class MulticallService {
  private readonly web3: Web3;
  private readonly contract;

  constructor(web3: Web3, multicallAddress: string) {
    this.web3 = web3;
    this.contract = new this.web3.eth.Contract([MulticallAbi.aggregate], multicallAddress);
  }

  async handleInBatches(calls: Map<string, CallData>) {
    const callsMap: Map<string, CallData> = new Map<string, CallData>();

    // this map is necessary to have in order to map class calls id to received map ids
    const callLabelToCallIdMap: Map<string, string> = new Map<string, string>();

    // set to map with no duplicates xD)
    calls.forEach((c, k) => {
      c.input.plain = this.web3.eth.abi.encodeFunctionCall(c.abi, c.input.data ? c.input.data : []);

      const callId = concatStrings(c.address, c.input.plain);

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

    const { returnData } = await this.contract.methods.aggregate(callsToBeExecuted).call();

    indexes.forEach(({ index, key }) => {
      const callInMap = callsMap.get(key);
      callInMap.output.plain = returnData[index];
      const outputResult = this.web3.eth.abi.decodeParameters(
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
