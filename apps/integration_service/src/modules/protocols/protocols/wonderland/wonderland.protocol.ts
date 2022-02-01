import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
} from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import BasicProtocol from './../basicProtocol';
import { WonderlandStaking } from './features/wonderland.staking';

export class WonderlandProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.wonderland;
  readonly name = ProtocolNameEnum.wonderland;
  readonly displayName = 'Wonderland';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.staking],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,

    // Features
    private readonly stakingFeature: WonderlandStaking,
  ) {
    super();
  }

  async getAllFeaturesBaseData(
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

  async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.stakingFeature.getData(addresses, chain);
      default:
        return [];
    }
  }
}
