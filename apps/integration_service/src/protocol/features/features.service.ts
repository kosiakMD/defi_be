import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { FeatureEnum } from '@app/common';
import { ChainAbbrEnum } from '@app/common/enum';

import { getChainByAbbr } from '../../utils/chain';
import { ProtocolService } from '../protocol.service';
import {
  ProtocolDataDto,
  ProtocolFeaturesDataDto,
  ProtocolFeaturesExportDto,
} from './features.dto';

@Injectable()
export class FeaturesService {
  private static createFeature(
    abbr: ChainAbbrEnum,
    features: FeatureEnum[],
  ): ProtocolFeaturesExportDto {
    return plainToClass(ProtocolFeaturesExportDto, {
      chain: getChainByAbbr(abbr),
      list: features,
    });
  }

  constructor(private readonly protocolService: ProtocolService) {}

  getAllFeatures(): ProtocolDataDto[] {
    const infos = this.protocolService.getAllProtocolsInfo();

    const protocols = [];

    infos.forEach((info) => {
      const features = info.features;
      const protocolName = info.name;
      const projectName = info.project;
      const protocol = plainToClass(ProtocolDataDto, {
        name: protocolName,
        project: projectName,
        // info: plainToClass(ProtocolFeatureInfoDto, info),
        info: undefined,
        features: [],
      } as ProtocolDataDto);
      Object.entries(features).forEach(([chainAbbr, features]) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const chainFeatures: ProtocolFeaturesDataDto = FeaturesService.createFeature(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          chainAbbr,
          features,
        );
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        protocol.features.push(chainFeatures);
      });
      protocols.push(protocol);
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // return Object.fromEntries<ProtocolDataDto>(featuresMap);
    return protocols;
  }
}
