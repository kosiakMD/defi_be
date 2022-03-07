import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { FarmingFeatureProcessor } from './services/farming.feature.processor';
import { IFeatureProcessor } from './services/feature.processor.interface';
import { Handler } from './services/handler';
import { HandlerSubgraph } from './services/handler.subgraph';
import { PoolsFeatureProcessor } from './services/pools.feature.processor';
import { ProtocolsIterator } from './services/protocols.iterator';

@Injectable()
export class FrameworkService {
  private featureProcessors: Map<string, IFeatureProcessor>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly protocolsIterator: ProtocolsIterator,
    private readonly handler: Handler,
    private readonly handlerSubgraph: HandlerSubgraph,
    private readonly poolsFeatureProcessor: PoolsFeatureProcessor,
    private readonly farmingFeatureProcessor: FarmingFeatureProcessor,
  ) {
    this.featureProcessors = new Map<string, IFeatureProcessor>([
      ['poolsFeatureProcessor', poolsFeatureProcessor],
      ['farmingFeatureProcessor', farmingFeatureProcessor],
    ]);
  }

  async start(): Promise<void> {
    const fInstructions = await this.protocolsIterator.run();
    for (const protocolFeatureInstructions of fInstructions) {
      for (const fSingleInstructions of protocolFeatureInstructions) {
        const hResults = [];
        for (const i of fSingleInstructions.instructions) {
          try {
            const handlerResult = await this.handler.handle(i);
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            console.log(JSON.stringify(handlerResult, null, 4));
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            hResults.push(handlerResult);
          } catch (e) {
            this.logger.warn('skipping instructions because of processing error:', e.message);
          }
        }
        const featureProcessor = this.resolveProcessor(fSingleInstructions.processor);
        if (!featureProcessor) {
          this.logger.warn('unsupported processor:', fSingleInstructions.processor);
        } else {
          await featureProcessor.process(hResults);
        }
      }
    }
  }

  async getAccountPosition(pName, address: string) {
    const instructions = await this.protocolsIterator.interactive(pName, address);
    const hResults = [];
    for (const i of instructions) {
      try {
        const handlerResult = await this.handlerSubgraph.handle(i);
        hResults.push(handlerResult);
      } catch (e) {
        this.logger.warn('skipping instructions because of processing error:', e.message);
      }
    }
  }

  private resolveProcessor(name: string): IFeatureProcessor {
    return this.featureProcessors.get(name);
  }
}
