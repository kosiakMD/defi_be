import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { AssetEntity } from '../../entities/asset.entity';
import { AaveStrategy } from './strategies/aave.strategy';
import { CompoundStrategy } from './strategies/compound.strategy';
import { CurveStrategy } from './strategies/curve.strategy';
import { ElipsisStrategy } from './strategies/elipsis.strategy';
import { StakedSOHMStrategy } from './strategies/stakedSOHM.strategy';
import { StakedSushiStrategy } from './strategies/stakedSushi.strategy';
import { TerraStrategy } from './strategies/terra.strategy';
import { UniswapStrategy } from './strategies/uniswap.strategy';
import { YearnStrategy } from './strategies/yearn.strategy';

@Injectable()
export class SpecificAssetsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly moduleRef: ModuleRef,
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
        const tknStrategy = this.moduleRef.get(TokenStrategy);
        // TODO: it would be good to know which strategy found underlying tokens
        // will be done in Max `get reserves` ticket
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
