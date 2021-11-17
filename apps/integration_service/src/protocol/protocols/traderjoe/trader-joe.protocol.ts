import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, TraderjoeProtocolEnum } from '@app/common/enum';

import { BaseData } from '../../../interfaces/transactions.interfaces';
import BasicProtocol from '../basicProtocol';
import { TraderJoePools } from './trader-joe.pools';
import { TraderJoeStaking } from './trader-joe.staking';

@Injectable()
export default class TraderJoeProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.traderjoe;
  readonly name = TraderjoeProtocolEnum.traderjoe;
  readonly displayName = 'Trader Joe';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  public static feeRate = 0.0025;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly staking: TraderJoeStaking,
    private readonly pools: TraderJoePools,
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

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, TraderJoeProtocol.name);
        errors.push(r.reason.toString());
      }
    });

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
      default:
        return [];
    }
  }
}
