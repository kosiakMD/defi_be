import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MetadataService } from '../../../common/services/metadata/metadata.service';

import { AssetEntity } from '../entities/asset.entity';
import { AaveStrategy } from './token-strategies/aave.strategy';
import { CompoundStrategy } from './token-strategies/compound.strategy';
import { CurveStrategy } from './token-strategies/curve.strategy';
import { ElipsisStrategy } from './token-strategies/elipsis.strategy';
import { StakedSOHMStrategy } from './token-strategies/stakedSOHM.strategy';
import { StakedSushiStrategy } from './token-strategies/stakedSushi.strategy';
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
    StakedSOHMStrategy,
    StakedSushiStrategy,
    TerraStrategy,
    YearnStrategy,
  ];

  public async getUnderlyingAssetsIfExists(processingAsset: AssetEntity): Promise<AssetEntity[]> {
    const resultsPromises = [];

    try {
      for (const TokenStrategy of this.tokenStrategies) {
        const tknStrategy = new TokenStrategy(this.logger, this.metadataService, this.multicall);
        // TODO: it would be good to know which strategy found underlying tokens
        // will be done in Max `get reservs` ticket
        resultsPromises.push(tknStrategy.attemptToLoadUnderlyingTokens(processingAsset));
      }
      const results = await Promise.allSettled(resultsPromises);
      const underlyingAssets = [];
      results.forEach((result) => {
        if (this.isFulfilled(result)) {
          result.value.forEach((token: string) => {
            const underlyingAsset = new AssetEntity();
            underlyingAsset.address = token;
            underlyingAsset.chainId = processingAsset.chainId;
            underlyingAssets.push(underlyingAsset);
          });
        } else {
          this.logger.debug(`Error to get undelying tokens`, result.reason);
        }
      });

      return underlyingAssets;
    } catch (e) {
      this.logger.error(e);
    }
  }

  private isFulfilled = <T>(input: PromiseSettledResult<T>): input is PromiseFulfilledResult<T> =>
    input.status === 'fulfilled';
}
