import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { AutofarmProtocolEnum, ChainAbbrEnum, ChainIdEnum, ProjectEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { AccountService } from '../../account/account.service';
import { AutofarmService } from '../../autofarm/services/autofarm.service';
import { FeatureDto } from '../../integrations/integrationFeatures';
import { PriceService } from '../../price/price.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class AutofarmProtocol extends BasicProtocol<AutofarmService> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.autofarm;
  readonly name = AutofarmProtocolEnum.autofarm;
  readonly displayName = 'Autofarm';
  readonly features = { [ChainAbbrEnum.bsc]: [FeatureEnum.staking] };
  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly autofarmService: AutofarmService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();

    this.dataProvider = autofarmService;
  }

  public [FeatureEnum.staking] = async (address: Address): Promise<FeatureDto> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return await this.autofarmService.getDataByAddresses(address, ChainIdEnum.bsc);

    // return {
    //   [FeatureEnum.staking]: data,
    // };
  };
}

export default AutofarmProtocol;
