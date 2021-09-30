import {
  Address,
  FeaturesType,
  IntegrationFeaturesData,
  Logger,
  ProtocolBasicInfo,
  ProtocolName,
} from '@app/common';
import { ChainAbbrEnum, ChainIdEnum, ProjectEnum } from '@app/common/enum';

import { ProtocolFeaturesInfo } from '../protocol.types';
import { RawFeaturesDto } from '../protocols.dto';

export abstract class AbstractProtocol {
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  protected abstract readonly chains: ChainAbbrEnum[];
  protected abstract readonly project: ProjectEnum;
  protected abstract readonly features: ProtocolFeaturesInfo;
  protected abstract readonly logger: Logger;
  abstract getFeaturesInfo<T extends FeaturesType>(chainId?: ChainIdEnum): T;
  abstract getInfo(chainId?: ChainIdEnum): ProtocolBasicInfo;
  abstract getAllFeaturesData?(
    address: string,
    chainId?: ChainIdEnum,
  ): Promise<IntegrationFeaturesData>;
  public abstract getAllFeaturesRawData?(
    address: Address,
    chainId?: ChainIdEnum,
  ): Promise<RawFeaturesDto>;
}

export default AbstractProtocol;
