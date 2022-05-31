import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AstroportProtocolEnum,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservice/account.service';
import { PriceService } from '../../../microservice/price.service';
import BasicProtocol from '../basic-protocol';
import { AstroportBootstrap } from './astroport.bootstrap';
import { AstroportLockdrop } from './astroport.lockdrop';
import { AstroportPools } from './astroport.pools';
import { AstroportStaking } from './astroport.staking';

@Injectable()
export class AstroportProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.terra];
  readonly project = ProjectEnum.astroport;
  readonly name = AstroportProtocolEnum.astroport;
  readonly displayName = 'Astroport';
  readonly features = {
    [ChainAbbrEnum.terra]: [
      FeatureEnum.pools,
      FeatureEnum.staking,
      FeatureEnum.lockedBalances,
      FeatureEnum.bootstrap,
    ],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly pools: AstroportPools,
    private readonly staking: AstroportStaking,
    private readonly lockedBalances: AstroportLockdrop,
    private readonly bootstrap: AstroportBootstrap,
  ) {
    super();
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const [data, errors] = handlePromiseAllSettled(chainFeatures);

    return [data.flat(), errors];
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
      case FeatureEnum.pools:
        return this.pools.getData(addresses, chain);
      case FeatureEnum.lockedBalances:
        return this.lockedBalances.getData(addresses, chain);
      case FeatureEnum.bootstrap:
        return this.bootstrap.getData(addresses, chain);
      default:
        return [];
    }
  }
}
