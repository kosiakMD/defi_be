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

import BasicProtocol from '../basicProtocol';
import { OlympusBonding } from './features/olympus.bonding';
import { OlympusStaking } from './features/olympus.staking';

export class OlympusProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.olympus;
  readonly name = ProtocolNameEnum.olympus;
  readonly displayName = 'Olympus';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking, FeatureEnum.lockedBalances],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,

    // Features
    private readonly stakingFeature: OlympusStaking,
    private readonly bondingFeature: OlympusBonding,
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

    const [data, errors] = handlePromiseAllSettled<BaseData[]>(chainFeatures);
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
      case FeatureEnum.lockedBalances:
        return this.bondingFeature.getData(addresses, chain);
      default:
        return [];
    }
  }
}
