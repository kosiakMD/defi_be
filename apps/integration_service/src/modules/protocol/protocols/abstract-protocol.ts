import {
  Address,
  ChainDto,
  FeaturesType,
  IntegrationFeaturesData,
  Logger,
  ProtocolBasicInfo,
  ProtocolName,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';

import { ProtocolFeaturesInfo } from '../../../common/types/protocol.types';

import { RawFeaturesDto } from '../dto/protocols.dto';

export abstract class AbstractProtocol {
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  protected abstract readonly chains: ChainAbbrEnum[];
  protected abstract readonly project: ProjectEnum;
  protected abstract readonly features: ProtocolFeaturesInfo;
  protected abstract readonly logger: Logger;
  abstract getFeaturesInfo(chain?: ChainAbbrEnum): FeaturesType;
  abstract getInfo(chain?: ChainAbbrEnum): ProtocolBasicInfo;
  abstract getAllFeaturesData?(
    address: Address,
    chain?: ChainDto,
  ): Promise<IntegrationFeaturesData>;
  public abstract getAllFeaturesRawData?(
    address: Address,
    chain?: ChainDto,
  ): Promise<RawFeaturesDto>;
  protected getData?(addresses: Address, chain: ChainDto): Promise<BaseData[]>;
}

export default AbstractProtocol;
