import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { ChainAbbrEnum } from '@app/common/enum';

import { getChainByAbbr } from '../../utils/chain';
import { ProtocolService } from '../protocol.service';
import {
  ProtocolDataDto,
  ProtocolFeaturesDataDto,
  ProtocolFeaturesExportDto,
} from './features.dto';
import { FeatureEnum } from './features.enum';

@Injectable()
export class FeaturesService {
  // private static createProtocolFeature(abbr: ChainAbbrEnum): ProtocolDataDto {
  //   return plainToClass(ProtocolDataDto, {
  //     chain: getChainByAbbr(abbr),
  //     protocol: [],
  //   } as ProtocolDataDto);
  // }

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

    // const featuresMap = new Map<FeatureEnum, FeatureResult>();
    // const featuresMap = new Map<ChainAbbrEnum, ProtocolDataDto>(
    //   getChainList().map((abbr) => [abbr, FeaturesService.createProtocolFeature(abbr)]),
    // );

    const protocols = [];

    infos.forEach((info) => {
      const features = info.features;
      const protocolName = info.name;
      const platformName = info.project;
      const protocol = plainToClass(ProtocolDataDto, {
        name: protocolName,
        project: platformName,
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
