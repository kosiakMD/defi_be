import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  StaderProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import BasicProtocol from '../basic-protocol';
import { StaderAirdrop } from './stader.airdrop';
import { StaderStaking } from './stader.staking';

@Injectable()
export class StaderProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.terra];
  readonly project = ProjectEnum.stader;
  readonly name = StaderProtocolEnum.stader;
  readonly displayName = 'Stader';
  readonly features = {
    [ChainAbbrEnum.terra]: [FeatureEnum.staking, FeatureEnum.airdrop, FeatureEnum.nativeStaking],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly staking: StaderStaking,
    private readonly airdrop: StaderAirdrop,
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
      case FeatureEnum.airdrop:
        return this.airdrop.getData(addresses, chain);
      default:
        return [];
    }
  }
}
