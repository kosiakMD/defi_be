import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { IAggregator } from './aggregator.interface';
import { DefilamaAggregator } from './impls/defilama.aggregator';
import { MultifarmFiAggregator } from './impls/multifarm.fi.aggregator';
import { VfatToolsAggregator } from './impls/vfat.tools.aggregator';

enum AggregatorServiceStatus {
  RUNNING = 'RUNNING',
  NOT_RUNNING = 'NOT_RUNNING',
}

@Injectable()
export class AggregatorsService {
  readonly aggregators: Map<string, IAggregator>;
  private serviceStatus: AggregatorServiceStatus;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly defilama: DefilamaAggregator,
    private readonly vfat: VfatToolsAggregator,
    private readonly multifarmFi: MultifarmFiAggregator,
  ) {
    this.aggregators = new Map<string, IAggregator>([
      [defilama.name, defilama],
      [vfat.name, vfat],
      [multifarmFi.name, multifarmFi],
    ]);
    this.serviceStatus = AggregatorServiceStatus.NOT_RUNNING;
  }

  async run() {
    if (this.serviceStatus === AggregatorServiceStatus.NOT_RUNNING) {
      this.serviceStatus = AggregatorServiceStatus.RUNNING;
      for (const [name, aggregator] of this.aggregators.entries()) {
        this.logger.log(`running aggregator: [${name}]`);
        await aggregator.run();
        this.logger.log(`aggregator finished: [${name}]`);
      }
      this.serviceStatus = AggregatorServiceStatus.NOT_RUNNING;
    }
  }
}
