import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export default class PancakeProtocolV1 extends BasicProtocol<any> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV1;
  readonly displayName = 'Pancake';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools],
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools],
  };
  protected dataProvider;
  protected feeRate: 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
  }
}
