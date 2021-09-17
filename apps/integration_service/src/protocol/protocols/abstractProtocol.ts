import { ProtocolName } from '@app/common';
import { ChainAbbrEnum, ChainIdEnum, ProjectEnum } from '@app/common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { ProtocolFeaturesInfo } from '../protocol.types';
import { DefaultDataProvider } from '../protocols.dto';

export abstract class AbstractProtocol<
  DataProvider extends DefaultDataProvider = DefaultDataProvider,
> {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly label: string;
  protected readonly features: ProtocolFeaturesInfo;
  protected readonly dataProvider?: DataProvider;
  protected readonly accountService: AccountService;
  protected readonly priceService: PriceService;
  protected readonly feeRate: number;
  protected readonly logger: Logger;
  abstract getFeaturesInfo(chainId?: ChainIdEnum): any;
  abstract getInfo(chainId?: ChainIdEnum): any;
  abstract getAllFeaturesData(address: string, chainId?: ChainIdEnum): any;
}

export default AbstractProtocol;
