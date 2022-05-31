import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  IntegrationFeaturesDataDto,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';

import { BaseData } from '../../../common/interfaces/transactions.interfaces';
import { FeaturesType, ProtocolFeaturesInfo } from '../../../common/types/protocol.types';

import { ProtocolBasicInfo } from '../../integration/dto/features.dto';
import { RawFeaturesDto } from '../dto/protocols.dto';
import AbstractProtocol from './abstract-protocol';

export abstract class BasicProtocol extends AbstractProtocol {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  abstract readonly features: ProtocolFeaturesInfo;
  protected abstract readonly logger: Logger;
  public readonly feeRate?: number;

  constructor() {
    super();
  }

  public getFeaturesInfo(chain?: ChainAbbrEnum): FeaturesType {
    return chain
      ? (this.features[chain] as FeatureEnum[])
      : (this.features as ProtocolFeaturesInfo);
  }

  public getInfo(chain?: ChainAbbrEnum): ProtocolBasicInfo {
    return {
      chains: this.chains,
      project: this.project,
      name: this.name,
      label: this.displayName,
      features: this.getFeaturesInfo(chain),
    };
  }

  public getAllFeaturesData?(
    address: Address,
    chain?: ChainDto,
  ): Promise<IntegrationFeaturesDataDto>;

  public getAllFeaturesBaseData?(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]>;

  public getAllFeaturesRawData?(address: string, chain?: ChainDto): Promise<RawFeaturesDto>;
}

export default BasicProtocol;
