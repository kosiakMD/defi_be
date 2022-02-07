import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../../../../../jobs/lambda_vaults/src/logger/logger.service';

class ChainCallDto {
  address: string;
  abi: AbiItem;
  inputData: any[];
}

class InstructionsDto {
  chainCalls: ChainCallDto[];
  fieldsMapping: object;
  processors: string[];
}

class OrderedCalls {
  keys: string[];
  calls: Map<string, CallData>;
}

interface IProcessor {
  process(input: any): Promise<void>;
}

class DummyProcessor implements IProcessor {
  process(input: any): Promise<void> {
    return Promise.resolve(input.perShare.times(100)); //
  }
}

@Injectable()
export class Handler {
  processors: Map<string, IProcessor>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {
    this.processors = new Map<string, IProcessor>([['DummyProcessor', new DummyProcessor()]]);
  }

  async handle(_instructions) {
    this.logger.debug('----------------------------------------------------');
    const instructions: InstructionsDto = plainToClass(InstructionsDto, _instructions);

    console.log({ instructions });

    const chainCalls = this.prepareChainCalls(instructions);

    console.log({ chainCalls });

    const chainCallsResult = await this.multicall.handleInBatches(
      chainCalls.calls,
      18,
    );

    console.log({ chainCallsResult });

    const collectedData = {
      chainCalls: chainCalls.keys.map((k) => chainCallsResult.get(k)),
    };

    console.log({ collectedData });

    const result = Object.keys(instructions.fieldsMapping).reduce((acc, field) => {
      const path = instructions.fieldsMapping[field];
      acc[field] = this.deepFind(collectedData, path);
      return acc;
    }, {});

    console.log({ result });

    for (const pName of (instructions.processors || [])) {
      const processor = this.resolveProcessor(pName);
      if (!processor) {
        console.warn('implementation of the processor is not configured', pName);
      } else {
        const processingResult = await processor.process(result);
        console.log({ pName, processingResult });
      }
    }

    this.logger.debug('----------------------------------------------------');
  }

  prepareChainCalls(instructions: InstructionsDto): OrderedCalls {
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

  resolveProcessor(processorName: string): IProcessor | null {
    return this.processors.get(processorName);
  }
}
