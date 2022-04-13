import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MetadataService } from '../../../common/services/metadata/metadata.service';

import { AssetsEntity } from '../entities/assets.entity';
import { AaveStrategy } from './token-strategies/aave.strategy';
import { CompoundStrategy } from './token-strategies/compound.strategy';
import { CurveStrategy } from './token-strategies/curve.strategy';
import { ElipsisStrategy } from './token-strategies/elipsis.strategy';
import { StakedStrategy } from './token-strategies/staked.strategy';
import { TerraStrategy } from './token-strategies/terra.strategy';
import { UniswapStrategy } from './token-strategies/uniswap.strategy';
import { YearnStrategy } from './token-strategies/yearn.strategy';

@Injectable()
export class TokenService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly metadataService: MetadataService,
    private readonly multicall: MulticallAggregator,
  ) {}

  private tokenStrategies = [
    UniswapStrategy,
    CompoundStrategy,
    AaveStrategy,
    CurveStrategy,
    ElipsisStrategy,
    StakedStrategy,
    TerraStrategy,
    YearnStrategy,
  ];

  public async getUnderlyingAssetsIfExists(processingAsset: AssetsEntity): Promise<AssetsEntity[]> {
    const resultsPromises = [];

    try {
      for (const TokenStrategy of this.tokenStrategies) {
        const tknStrategy = new TokenStrategy(this.logger, this.metadataService, this.multicall);
        // TODO: it would be good to know which strategy found underlying tokens
        resultsPromises.push(tknStrategy.attemptToLoadUnderlyingTokens(processingAsset));
      }

      // TODO: Log error
      const results = await Promise.allSettled(resultsPromises);

      return (results.find(this.isFulfilled)?.value || []).map((token) => {
        const asset = new AssetsEntity();
        asset.address = token;
        asset.chainId = processingAsset.chainId;
        asset.disabled = true;
        return asset;
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  private isFulfilled = <T>(input: PromiseSettledResult<T>): input is PromiseFulfilledResult<T> =>
    input.status === 'fulfilled';
}
