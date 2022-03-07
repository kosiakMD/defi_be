import { plainToClass } from 'class-transformer';

import { CallData } from '@app/common/dto/CallData';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { ILpAddressFetcher } from './lp.address.fetcher.interface';

export class LpTokenLpAddressFetcher implements ILpAddressFetcher {
  constructor(private readonly multicall: MulticallAggregator) {}
  async fetchPoolsLps(chainCode: any, address: string, abi: any): Promise<string[]> {
    const poolLengthCall = plainToClass(CallData, {
      address: address,
      abi: abi.poolLength,
    });
    const poolLengthCallResult = await this.multicall.handleInBatches(
      new Map<string, CallData>([['poolLength', poolLengthCall]]),
      chainCode,
    );

    const poolLength = poolLengthCallResult.get('poolLength').output.data;

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLength; i++) {
      calls.set(
        concatStrings(address, i),
        plainToClass(CallData, {
          address: address,
          abi: abi.lpToken,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicall.handleInBatches(calls, chainCode);

    const lpAddresses = [];
    for (let i = 0; i < poolLength; i++) {
      lpAddresses.push(callsRsp.get(concatStrings(address, i)).output.data);
    }
    return lpAddresses;
  }
}
