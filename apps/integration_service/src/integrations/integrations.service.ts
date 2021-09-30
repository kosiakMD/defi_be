import { plainToClass } from 'class-transformer';

import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { IntegrationFeaturesDataDto, Logger, ProtocolName } from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { CurrencyDto } from '@app/common/dto/currency.dto';
import { ChainIdEnum, ResultStatus } from '@app/common/enum';

import { FeaturesResponseDto, ProtocolBasicInfo } from '../protocol/features/features.dto';
import { FeaturesService } from '../protocol/features/features.service';
import { ProtocolService } from '../protocol/protocol.service';
import { getChainByAbbr } from '../utils/chain';
import { IntChainsDataDto, IntegrationsResponseDto, ProtocolInfoDto } from './integrations.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
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

    if (!protocol) {
      throw new NotImplementedException(`Protocol '${protocolName}' is not supported yet`);
    }

    const allowedChains = chains.filter((chain) => {
      const basicInfo = protocol.getInfo();
      return basicInfo.chains?.includes(ChainIdToAbbr[chain]);
    });

    if (!allowedChains.length) {
      throw new NotImplementedException(
        `Protocol '${protocolName}' doesn't support any of these chains: ${chains.join(', ')}`,
      );
    }

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
    const allData = await Promise.allSettled<any>( // <IntegrationFeaturesDataDto>
      allowedChains.map((chainId) =>
        this.protocolService.getProtocolFeatures(protocolName, addresses, chainId),
      ),
    );
    // Data
    allowedChains.forEach((chainId, dataIndex) => {
      const chainData = plainToClass(IntChainsDataDto, {});
      const chainAbbr = ChainIdEnum[chainId];
      // Chain Info
      chainData.chain = getChainByAbbr(chainAbbr);
      // Protocol Features Info
      chainData.features = [...(info?.features[chainAbbr] ?? [])];
      // Result Features Data
      const chainResult = allData[dataIndex];
      if (chainResult.status === 'fulfilled') {
        const value: IntegrationFeaturesDataDto = chainResult.value;
        Object.assign(chainData, value);
        if (value.errors) {
          response.errors.push(value.errors);
        }
      } else {
        this.logger.error(chainResult.reason, 'getProtocolFeatures');
        response.errors.push(chainResult.reason.message || chainResult.reason);
      }

      response.data.chains.push(chainData);
    });

    response.errors = response.errors.flat();

    if (response.errors.length) {
      response.status = ResultStatus.error;
    }
    return response;
  }
}
