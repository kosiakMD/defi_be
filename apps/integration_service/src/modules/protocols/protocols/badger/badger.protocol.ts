import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, BadgerProtocolEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import BasicProtocol from '../basicProtocol';
import { BadgerStaking } from './badger.staking';

@Injectable()
export default class BadgerProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg, ChainAbbrEnum.arbi];
  readonly project = ProjectEnum.badger;
  readonly name = BadgerProtocolEnum.badger;
  readonly displayName = 'Badger';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking],
    [ChainAbbrEnum.plg]: [FeatureEnum.staking],
    [ChainAbbrEnum.arbi]: [FeatureEnum.staking],
  };
  public static feeRate = 0.002;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly staking: BadgerStaking,
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
      default:
        return [];
    }
  }
}
