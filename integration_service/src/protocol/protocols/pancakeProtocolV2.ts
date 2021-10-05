import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ChainIdEnum, PancakeProtocolEnum, ProjectEnum } from '../../common/enum';
import { Address } from '../../common/types';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { BaseData } from '../../interfaces/transactions.interfaces';
import { PancakeService } from '../../pancake/pancake.service';
import { PriceService } from '../../price/price.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export default class PancakeProtocolV2 extends BasicProtocol<any> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV2;
  readonly displayName = 'Pancake V2';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools],
  };
  protected feeRate = 0.003;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly pancakeService: PancakeService,
  ) {
    super();

    this.dataProvider = this;
  }

  public getDataByAddresses(address: Address, chainId: ChainIdEnum): Promise<BaseData[]> {
    return this.pancakeService.getDataByAddresses(address, chainId, this.name);
  }
}
