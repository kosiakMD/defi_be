import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, Logger } from '@app/common';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../../account/account.service';
import { BaseData } from '../../../interfaces/transactions.interfaces';
import { PriceService } from '../../../price/price.service';
import { PancakeSubgraph } from '../../../thegraph/pancake.subgraph';
import { FeatureEnum } from '../../features/features.enum';
import DataProviderProtocol from '../dataProviderProtocol';
import { Mapper } from '../mappers/mapper';
import { PancakeService } from './pancake.service';

@Injectable()
export default class PancakeProtocolV1 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV1;
  readonly displayName = 'Pancake V1';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools],
  };
  public feeRate = 0.003;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PancakeSubgraph,
    protected readonly mapper: Mapper,
    private readonly pancakeService: PancakeService,
  ) {
    super();

    this.dataProvider = this;
  }

  public getDataByAddresses(address: Address, chain: ChainDto): Promise<BaseData[]> {
    return this.pancakeService.getDataByAddresses(address, chain, this.name);
  }
}
