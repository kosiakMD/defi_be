import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, IslandswapProtocolEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import BasicProtocol from '../basicProtocol';
import { IslandswapStaking } from './islandswap.staking';
import { IslandswapPools } from './islandswap.pools';

@Injectable()
export default class IslandswapProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.okex];
  readonly project = ProjectEnum.islandswap;
  readonly name = IslandswapProtocolEnum.islandswap;
  readonly displayName = 'Islandswap';
  readonly features = {
    [ChainAbbrEnum.okex]: [FeatureEnum.staking, FeatureEnum.pools],
  };
  
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly staking: IslandswapStaking,
    private readonly pools: IslandswapPools,
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
      default:
        return [];
    }
  }
}
