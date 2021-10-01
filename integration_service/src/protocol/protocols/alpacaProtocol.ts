import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AlpacaProtocolEnum, ChainAbbrEnum, ProjectEnum } from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { AlpacaService } from '../../alpaca/services/alpaca.service';
import { PriceService } from '../../price/price.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class AlpacaProtocol extends BasicProtocol<AlpacaService> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.alpaca;
  readonly name = AlpacaProtocolEnum.alpaca;
  readonly displayName = 'Alpaca';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.staking, FeatureEnum.lending, FeatureEnum.leverageFarming],
  };
  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly alpacaService: AlpacaService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();

    this.dataProvider = alpacaService;
  }
}

export default AlpacaProtocol;
