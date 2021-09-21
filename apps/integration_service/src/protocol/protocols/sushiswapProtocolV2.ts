import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ProjectEnum, SushiSwapProtocolEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { FeatureDto } from '../../integrations/integrationFeatures';
import { PriceService } from '../../price/price.service';
import { SushiswapService } from '../../sushiswap/sushiswap.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class SushiswapProtocolV2
  extends BasicProtocol<SushiswapService>
  implements AbstractProtocol
{
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.sushiswap;
  readonly name = SushiSwapProtocolEnum.sushiswapV2;
  readonly label = 'Sushiswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  protected feeRate: 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly sushiswapService: SushiswapService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();

    this.dataProvider = sushiswapService;
  }

  public [FeatureEnum.pools] = async (address: Address): Promise<FeatureDto> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const data = await this.sushiswapService.getDataByAddresses(address);
    const featureData = data.find((data) => data['liquidityPositions'])['liquidityPositions'][0];

    if (featureData) {
      return {
        [FeatureEnum.pools]: featureData,
      };
    } else {
      return null;
    }
  };

  public [FeatureEnum.transactions] = async (address: Address): Promise<FeatureDto> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const data = await this.sushiswapService.getDataByAddresses(address);
    const featureData = data.find((data) => data['txs'])['txs'];

    if (featureData) {
      return {
        [FeatureEnum.transactions]: featureData,
      };
    } else {
      return null;
    }
  };

  public [FeatureEnum.staking] = async (address: Address): Promise<FeatureDto> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const data = await this.sushiswapService.getDataByAddresses(address);
    const featureData = data.find((data) => data['stakingPositions'])['stakingPositions'];

    return {
      [FeatureEnum.staking]: featureData,
    };
  };
}

export default SushiswapProtocolV2;
