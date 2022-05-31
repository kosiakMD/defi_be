import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  MirrorProtocolEnum,
  ProjectEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import BasicProtocol from '../basicProtocol';
import { MirrorMintService } from './mirror.mint.service';
import { MirrorStaking } from './mirror.staking';

@Injectable()
export class MirrorProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.terra];
  readonly project = ProjectEnum.mirror;
  readonly name = MirrorProtocolEnum.mirror;
  readonly displayName = 'Mirror';
  readonly features = {
    [ChainAbbrEnum.terra]: [FeatureEnum.staking, FeatureEnum.mint, FeatureEnum.shortFarm],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly staking: MirrorStaking,
    private readonly mint: MirrorMintService,
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
      case FeatureEnum.mint:
        return this.mint.getData(addresses, chain);
      default:
        return [];
    }
  }
}
