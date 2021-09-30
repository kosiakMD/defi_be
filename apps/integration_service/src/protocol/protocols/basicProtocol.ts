import {
  ChainAbbrEnum,
  ChainIdEnum,
  IntegrationFeaturesDataDto,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';

import { ProtocolBasicInfo } from '../features/features.dto';
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

  public getFeaturesInfo<T extends FeaturesType>(chainId?: ChainIdEnum): T {
    const abbr = ChainIdEnum[chainId];
    return chainId ? this.features[abbr] : this.features;
  }

  public getInfo(chainId?: ChainIdEnum): ProtocolBasicInfo {
    return {
      chains: this.chains,
      project: this.project,
      name: this.name,
      label: this.displayName,
      features: this.getFeaturesInfo(chainId),
    };
  }

  public getAllFeaturesData?(
    address: string,
    chainId?: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto>;

  public getAllFeaturesRawData?(address: string, chainId?: ChainIdEnum): Promise<RawFeaturesDto>;
}

export default BasicProtocol;
