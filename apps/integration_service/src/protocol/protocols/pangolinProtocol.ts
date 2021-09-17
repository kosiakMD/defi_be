import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ProjectEnum, PangolinProtocolEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { FeatureDto } from '../../integrations/integrationFeatures';
import { PangolinService } from '../../pangolin/pangolin.service';
import { PriceService } from '../../price/price.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class PangolinProtocol extends BasicProtocol<PangolinService> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.pangolin;
  readonly name = PangolinProtocolEnum.pangolin;
  readonly label = 'Pangolin';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  protected feeRate: 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly pangolinService: PangolinService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();

    this.dataProvider = pangolinService;
  }

  public [FeatureEnum.pools] = async (address: Address): Promise<FeatureDto> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const data = await this.pangolinService.getDataByAddresses(address);
    const featureData = data.find((data) => data['liquidityPositions'])['liquidityPositions'][0];

    if (featureData) {
      return {
        [FeatureEnum.pools]: featureData,
      };
    } else {
      return null;
    }
  };

  public [FeatureEnum.staking] = async (address: Address): Promise<FeatureDto> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const data = await this.pangolinService.getDataByAddresses(address);
    const featureData = data.find((data) => data['stakingPositions'])['stakingPositions'];

    return {
      [FeatureEnum.staking]: featureData,
    };
  };
}

export default PangolinProtocol;
