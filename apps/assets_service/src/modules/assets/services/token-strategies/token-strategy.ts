import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MetadataService } from '../../../../common/services/metadata/metadata.service';

import { AssetsEntity } from '../../entities/assets.entity';

// TODO: Rename class to more specific
export abstract class UnderlyingTokenStrategy {
  // TODO: Remove constructor
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly metadataService: MetadataService,
    protected readonly multicall: MulticallAggregator,
  ) {}
  // TODO: Rename method and not return any
  public abstract attemptToLoadUnderlyingTokens(asset: AssetsEntity): Promise<string[]>;

  // public abstract checkAsset(asset: AssetsEntity): Promise<{
  //   underlying: string[],
  //   category: string, // or enum,
  //   metadata?: any,
  // }>;
}
