import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainAbbrEnum,
  Logger,
  IntegrationFeaturesDataDto,
  ChainIdEnum,
  FeatureEnum,
  YearnProtocolEnum,
} from '@app/common';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { YearnV1Subgraph } from './yearn/services/yearn.v1.subgraph';
import { YearnProtocolBase } from './yearn/yearnProtocolBase';

@Injectable()
export default class YearnProtocolV1 extends YearnProtocolBase {
  readonly chains = [ChainAbbrEnum.eth];
  readonly displayName = 'YearnV1';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking],
  };
  readonly name = YearnProtocolEnum.YearnV1;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly yearnSubgraph: YearnV1Subgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
  }

  async getAllFeaturesData(
    address: string,
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await this.getStakingData(response, address, chainId);

    return response;
  }
}
