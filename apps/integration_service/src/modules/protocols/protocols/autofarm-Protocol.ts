import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { AutofarmProtocolEnum, ChainAbbrEnum, ProjectEnum } from '@app/common/enum';

import { BaseData } from '../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../chains/web3.provider';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { AutofarmSubgraph } from '../../subgraphs/subgraphs/autofarm.subgraph';
import AbstractProtocol from './abstract-protocol';
import { AutofarmApiService } from './autofarm/autofarm.api.service';
import { AutofarmStaking } from './autofarm/autofarm.staking';
import DataProviderProtocol from './data-provider-protocol';

@Injectable()
export class AutofarmProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [
    ChainAbbrEnum.avax,
    ChainAbbrEnum.bnb,
    ChainAbbrEnum.celo,
    ChainAbbrEnum.cro,
    //chainAbbr-enum.ftm,
    //chainAbbr-enum.harm,
    ChainAbbrEnum.heco,
    //chainAbbr-enum.mriver,
    //chainAbbr-enum.okex,
    ChainAbbrEnum.plg,
  ];
  readonly project = ProjectEnum.autofarm;
  readonly name = AutofarmProtocolEnum.autofarm;
  readonly displayName = 'Autofarm';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.staking],
    [ChainAbbrEnum.bnb]: [FeatureEnum.staking],
    [ChainAbbrEnum.celo]: [FeatureEnum.staking],
    [ChainAbbrEnum.cro]: [FeatureEnum.staking],
    //[ChainAbbrEnum.ftm]: [FeatureEnum.staking],
    //[ChainAbbrEnum.harm]: [FeatureEnum.staking],
    [ChainAbbrEnum.heco]: [FeatureEnum.staking],
    //[ChainAbbrEnum.mriver]: [FeatureEnum.staking],
    //[ChainAbbrEnum.okex]: [FeatureEnum.staking],
    [ChainAbbrEnum.plg]: [FeatureEnum.staking],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly web3Provider: Web3Provider,
    private readonly subgraph: AutofarmSubgraph,
    private readonly autofarmApiService: AutofarmApiService,
    private readonly staking: AutofarmStaking,
  ) {
    super();

    this.dataProvider = this;
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
        this.logger.error(r.reason, r.reason.stack, AutofarmProtocol.name);
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
      default:
        return [];
    }
  }
}

export default AutofarmProtocol;
