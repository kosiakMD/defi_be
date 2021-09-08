import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum, ProtocolName, ResultStatus } from '../common/enum';

import { CurrencyDto } from '../dto/currency.dto';
import { FeaturesResponseDto, ProtocolBasicInfo } from '../protocol/features/features.dto';
import { FeaturesService } from '../protocol/features/features.service';
import { ProtocolService } from '../protocol/protocol.service';
import { getChainByAbbr } from '../utils/chain';
import { IntChainsDataDto, IntegrationsResponseDto, ProtocolInfoDto } from './integrations.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly featuresService: FeaturesService,
    private readonly protocolService: ProtocolService,
  ) {}

  getAllFeatures(): FeaturesResponseDto {
    return plainToClass(FeaturesResponseDto, {
      data: this.featuresService.getAllFeatures(),
    });
  }

  async getProtocolFeaturesData(
    protocolName: ProtocolName,
    chains: ChainIdEnum[],
    addresses,
  ): Promise<IntegrationsResponseDto> {
    const protocol = this.protocolService.getProtocolByName(protocolName);
    const response: IntegrationsResponseDto = plainToClass(IntegrationsResponseDto, {
      errors: [],
      data: {},
    } as IntegrationsResponseDto);
    // Info
    let info: ProtocolBasicInfo;
    try {
      info = protocol.getInfo();
    } catch (e) {
      response.errors.push(e);
    }
    // Protocol Info
    response.data.protocol = plainToClass(ProtocolInfoDto, info);
    // Currency
    response.data.currency = plainToClass(CurrencyDto, {});
    // Features Data
    const allData = await Promise.allSettled<any>(
      chains.map(
        async (chainId) =>
          await this.protocolService.getProtocolFeatures(protocolName, addresses, chainId),
      ),
    );
    // Data
    chains.forEach((chainId, dataIndex) => {
      const chainData = plainToClass(IntChainsDataDto, {});
      const chainAbbr = ChainIdEnum[chainId];
      // Chain Info
      chainData.chain = getChainByAbbr(chainAbbr);
      // Protocol Features Info
      chainData.features = [...info.features[chainAbbr]];
      // Result Features Data
      const chainResult = allData[dataIndex];
      if (chainResult.status === 'fulfilled') {
        Object.assign(chainData, chainResult.value);
        if (chainResult.value.errors) {
          response.errors = [...response.errors, ...chainResult.value.errors];
        }
      } else {
        response.errors.push(chainResult.reason);
      }

      response.data.chains.push(chainData);
    });

    if (response.errors.length) {
      response.status = ResultStatus.error;
    }
    return response;
  }
}
