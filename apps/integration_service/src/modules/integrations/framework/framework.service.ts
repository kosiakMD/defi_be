import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { Handler } from './handler';
import { IFeatureProcessor } from './processors/feature.processor.interface';
import { PoolsFeatureProcessor } from './processors/pools.feature.processor';
import { ProtocolsIterator } from './protocols.iterator';

@Injectable()
export class FrameworkService {
  private featureProcessors: Map<string, IFeatureProcessor>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly protocolsIterator: ProtocolsIterator,
    private readonly handler: Handler,
    private readonly poolsFeatureProcessor: PoolsFeatureProcessor,
  ) {
    this.featureProcessors = new Map<string, IFeatureProcessor>([
      ['poolsFeatureProcessor', poolsFeatureProcessor],
    ]);
  }

  async start(): Promise<void> {
    this.logger.debug('STARTED');
    const instructions = await this.protocolsIterator.run();
    // console.log(JSON.stringify(instructions[0][0][0], null, 4));
    const hResults = [];
    for (const i of instructions[0][0][0]) {
      try {
        const handlerResult = await this.handler.handle(i);
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        console.log(JSON.stringify(handlerResult, null, 4));
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        hResults.push(handlerResult);
      } catch (e) {
        console.warn('skipping instructions because of processing error:', e.message);
        // console.warn(JSON.stringify(i, null, 4));
      }
    }
    const featureProcessor = this.resolveProcessor('poolsFeatureProcessor'); //TODO get name of the processor from config
    await featureProcessor.process(hResults);
  }

  private resolveProcessor(name: string): IFeatureProcessor {
    return this.featureProcessors.get(name);
  }
}
