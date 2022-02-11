import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { IFeatureProcessor } from './services/feature.processor.interface';
import { Handler } from './services/handler';
import { PoolsFeatureProcessor } from './services/pools.feature.processor';
import { ProtocolsIterator } from './services/protocols.iterator';
import { StakingFeatureProcessor } from './services/staking.feature.processor';

@Injectable()
export class FrameworkService {
  private featureProcessors: Map<string, IFeatureProcessor>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly protocolsIterator: ProtocolsIterator,
    private readonly handler: Handler,
    private readonly poolsFeatureProcessor: PoolsFeatureProcessor,
    private readonly stakingFeatureProcessor: StakingFeatureProcessor,
  ) {
    this.featureProcessors = new Map<string, IFeatureProcessor>([
      ['poolsFeatureProcessor', poolsFeatureProcessor],
      ['stakingFeatureProcessor', stakingFeatureProcessor],
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

  private resolveProcessor(name: string): IFeatureProcessor {
    return this.featureProcessors.get(name);
  }
}
