import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';

import { ChainIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { ERC20TokenDto, LiquidityPoolFeature, PoolTokenDto } from '../integrations.dto';
import { LiquidityPoolJobAbstract } from '../liquidity.pool.job.abstract';
import { SPOOKYSWAP_POOLS } from './pools';

@Injectable()
export class SpookyswapPoolJob extends LiquidityPoolJobAbstract {
  public chain = ChainIdEnum.ftm;
  public protocol = 'SpookySwap'; // must be Enum!
  public feature = 'pools'; // must be Enum!

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
  ) {
    super();
  }

  // this needs to use in order to update database configuration (to be done)
  async updateTrackedLiquidityPools(): Promise<LiquidityPoolFeature[]> {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    // collect lp tokens data from account service
    for (const pa of SPOOKYSWAP_POOLS) {
      const trackedLiquidityPoolTokenData: LiquidityPoolTokenDto =
        await this.accountService.saveTrackingAsset(pa, this.chain);

      const lpToken: ERC20TokenDto = plainToClass(ERC20TokenDto, trackedLiquidityPoolTokenData, {
        excludeExtraneousValues: true,
      });

      const liquidityPoolFeature = plainToClass(LiquidityPoolFeature, {});
      liquidityPoolFeature.address = trackedLiquidityPoolTokenData.address;
      liquidityPoolFeature.name = trackedLiquidityPoolTokenData.underlyingAssets
        .map((ua) => ua.symbol)
        .join('/');
      liquidityPoolFeature.lpToken = lpToken;

      trackedLiquidityPoolTokenData.underlyingAssets.forEach((pt) => {
        const poolToken: PoolTokenDto = plainToClass(PoolTokenDto, pt, {
          excludeExtraneousValues: true,
        });
        liquidityPoolFeature.tokens.push(poolToken);
      });
      this.liquidityPoolsFeatures.push(liquidityPoolFeature);
    }
    return this.liquidityPoolsFeatures;
  }
}
