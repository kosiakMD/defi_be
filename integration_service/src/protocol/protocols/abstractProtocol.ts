import { ChainAbbrEnum, ChainIdEnum, ProjectEnum, ProtocolName } from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { IntegrationFeaturesData } from '../../integrations/integrations.dto';
import { ProtocolBasicInfo } from '../features/features.dto';
import { FeaturesType, ProtocolFeaturesInfo } from '../protocol.types';
import { RawFeaturesDto } from '../protocols.dto';

export abstract class AbstractProtocol {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  abstract readonly features: ProtocolFeaturesInfo;
  // todo delete
  // protected abstract readonly dataProvider?: DefaultDataProvider | UniswapLikeSubgraph;
  // protected abstract readonly accountService: AccountService;
  // protected abstract readonly priceService: PriceService;
  protected abstract readonly feeRate?: number;
  protected abstract readonly logger: Logger;
  abstract getFeaturesInfo<T extends FeaturesType>(chainId?: ChainIdEnum): T;
  abstract getInfo(chainId?: ChainIdEnum): ProtocolBasicInfo;
  abstract getAllFeaturesData(
    address: string,
    chainId?: ChainIdEnum,
  ): Promise<IntegrationFeaturesData>;
  protected abstract getAllFeaturesRawData(
    address: string,
    chainId?: ChainIdEnum,
  ): Promise<RawFeaturesDto>;
}

export default AbstractProtocol;
