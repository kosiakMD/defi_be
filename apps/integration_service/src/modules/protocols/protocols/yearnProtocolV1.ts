import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  IntegrationFeaturesDataDto,
  Logger,
  YearnProtocolEnum,
} from '@app/common';

import { Web3Provider } from '../../chains/web3.provider';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { YearnV1Subgraph } from '../../subgraphs/subgraphs/yearn.v1.subgraph';
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
    protected readonly web3Provider: Web3Provider,
  ) {
    super();
  }

  async getAllFeaturesData(address: Address, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await this.getStakingData(response, address, chain);

    return response;
  }
}
