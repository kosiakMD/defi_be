import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, MojitoswapProtocolEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import BasicProtocol from '../basicProtocol';
import { MojitoswapStaking } from './mojitoswap.staking';
import { MojitoswapPools } from './mojitoswap.pools';

@Injectable()
export default class MojitoswapProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.kcc];
  readonly project = ProjectEnum.mojitoswap;
  readonly name = MojitoswapProtocolEnum.mojitoswap;
  readonly displayName = 'Mojitoswap';
  readonly features = {
    [ChainAbbrEnum.kcc]: [FeatureEnum.staking, FeatureEnum.pools],
  };
  
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly staking: MojitoswapStaking,
    private readonly pools: MojitoswapPools,
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
