import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  IntegrationFeaturesDataDto,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';

import { ProtocolBasicInfo } from '../features/features.dto';
import { FeatureEnum } from '../features/features.enum';
import { FeaturesType, ProtocolFeaturesInfo } from '../protocol.types';
import { RawFeaturesDto } from '../protocols.dto';
import AbstractProtocol from './abstractProtocol';

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

  public getAllFeaturesRawData?(address: string, chain?: ChainDto): Promise<RawFeaturesDto>;
}

export default BasicProtocol;
