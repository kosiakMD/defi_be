import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '@app/common/dto/CallData';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { Instructions, OrderedCalls } from '../models';

@Injectable()
export class Handler {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  async handle(_instructions) {
    this.logger.debug('-----------------handle start----------------------');
    const instructions: Instructions = plainToClass(Instructions, _instructions);

    // console.log(JSON.stringify(instructions, null, 4));

    const chainCalls = this.prepareChainCalls(instructions);

    // console.log({ chainCalls });

    const chainCallsResult = await this.multicall.handleInBatches(
      chainCalls.calls,
      instructions.context.chainCode,
    );

    // console.log({ chainCallsResult });

    const collectedData = {
      chainCalls: chainCalls.keys.map((k) => chainCallsResult.get(k)),
    };

    // console.log({ collectedData });

    const result = Object.keys(instructions.fieldsMapping).reduce((acc, field) => {
      const path = instructions.fieldsMapping[field];
      acc[field] = this.deepFind(collectedData, path);
      return acc;
    }, {});

    // console.log({ result });

    this.logger.debug('--------------------handle end--------------------');

    return {
      ...result,
      ...instructions.context,
    };
  }

  prepareChainCalls(instructions: Instructions): OrderedCalls {
    return instructions.chainCalls.reduce(
      (acc, { address, abi, inputData }, i) => {
        const key = 'unique-generated-key-per-call - ' + i;
        acc.keys.push(key);
        acc.calls.set(
          key,
          plainToClass(CallData, {
            address,
            abi,
            input: { data: inputData },
          }),
        );
        return acc;
      },
      plainToClass(OrderedCalls, {
        keys: [],
        calls: new Map<string, CallData>(),
      }),
    );
  }

  deepFind(obj, path) {
    const paths = path.split('.');
    let current = obj;

    for (let i = 0; i < paths.length; ++i) {
      if (current[paths[i]] === undefined) {
        return undefined;
      }
      current = current[paths[i]];
    }
    return current;
  }
}
