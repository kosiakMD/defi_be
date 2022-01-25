import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
} from '@app/common';
import { FeatureEnum } from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import BasicProtocol from './../basicProtocol';
import { AbracadabraBorrowing } from './features/abracadabra.borrowing';
import { AbracadabraClaimable } from './features/abracadabra.claimable';
import { AbracadabraStaking } from './features/abracadabra.staking';

export class AbracadabraProtocol extends BasicProtocol {
  readonly chains = [
    ChainAbbrEnum.arbi,
    ChainAbbrEnum.avax,
    ChainAbbrEnum.bsc,
    ChainAbbrEnum.eth,
    ChainAbbrEnum.ftm,
  ];
  readonly project = ProjectEnum.abracadabra;
  readonly name = ProtocolNameEnum.abracadabra;
  readonly displayName = 'Abracadabra';
  readonly features = {
    [ChainAbbrEnum.arbi]: [
      FeatureEnum.collateral, // collateral deposited
      FeatureEnum.borrowing, // mim borrowed
      FeatureEnum.health, // borrow health
      FeatureEnum.claimable, // mim balance on bentobox
    ],

    [ChainAbbrEnum.avax]: [
      FeatureEnum.collateral, // collateral deposited
      FeatureEnum.borrowing, // mim borrowed
      FeatureEnum.health, // borrow health
      FeatureEnum.claimable, // mim balance on bentobox
    ],

    [ChainAbbrEnum.bsc]: [
      FeatureEnum.collateral, // collateral deposited
      FeatureEnum.borrowing, // mim borrowed
      FeatureEnum.health, // borrow health
      FeatureEnum.claimable, // mim balance on bentobox
    ],

    [ChainAbbrEnum.eth]: [
      FeatureEnum.staking, // spell staking
      FeatureEnum.collateral, // collateral deposited
      FeatureEnum.borrowing, // mim borrowed
      FeatureEnum.health, // borrow health
      FeatureEnum.claimable, // mim balance on bentobox
    ],

    [ChainAbbrEnum.ftm]: [
      FeatureEnum.collateral, // collateral deposited
      FeatureEnum.borrowing, // mim borrowed
      FeatureEnum.health, // borrow health
      FeatureEnum.claimable, // mim balance on bentobox
    ],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,

    // Features
    private readonly borrowingFeature: AbracadabraBorrowing,
    private readonly claimableFeature: AbracadabraClaimable,
    private readonly stakingFeature: AbracadabraStaking,
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
      case FeatureEnum.borrowing:
        // Includes: FeatureEnum.collateral, FeatureEnum.health
        return this.borrowingFeature.getData(addresses, chain);
      case FeatureEnum.claimable:
        return this.claimableFeature.getData(addresses, chain);
      default:
        return [];
    }
  }
}
