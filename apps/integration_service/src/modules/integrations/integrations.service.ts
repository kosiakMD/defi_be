import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  FeatureEnum,
  FeaturesResponseDto,
  IntegrationFeaturesDataDto,
  Logger,
  ProtocolName,
} from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { CurrencyDto } from '@app/common/dto/currency.dto';
import { ChainIdEnum, ResultStatus } from '@app/common/enum';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { NotifyPayloadFeaturesDto } from '../../common/dto';
import { getChainById } from '../../common/utils/chain';

import { ProtocolService } from '../protocols/protocol.service';
import { ProtocolBasicInfo, ProtocolDataDto } from './dto/features.dto';
import {
  IntChainsDataDto,
  IntegrationsResponseDto,
  IntegrationsResponseV2Dto,
  IntegrationWalletDto,
  ProtocolInfoDto,
} from './dto/integrations.dto';
import { FeaturesService } from './features.service';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly featuresService: FeaturesService,
    private readonly protocolService: ProtocolService,
  ) {}

  getAllFeatures(): FeaturesResponseDto {
    return plainToClass(FeaturesResponseDto, {
      data: this.featuresService.getAllFeatures(),
    });
  }

  async getActiveFeatures(): Promise<any[]> {
    const protocols: ProtocolDataDto[] = this.featuresService.getAllFeatures();
    for (const protocol of protocols) {
      for (const feature of protocol.features) {
        for (const ft of feature.list) {
          const cachedData = await this.cache.get(
            feature.chain.id + '_' + protocol.name + '_' + ft,
          );
          if (cachedData) {
            feature[ft] = (cachedData as NotifyPayloadFeaturesDto).items;
          }
        }
      }
    }

    return protocols;
  }

  private static getActive(ft: FeatureEnum, cachedData: NotifyPayloadFeaturesDto) {
    if (ft === FeatureEnum.staking) {
      const items: IntegrationStakingPositionDto[] = cachedData.items;
      return items.filter((i) => {
        let isActive = false;
        i.rewards.forEach((r) => {
          if (r.apr > 0) isActive = true;
        });
        return isActive;
      });
    }
    return [];
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
      allowedChains.map((chainId) => {
        const chain: ChainDto = getChainById(chainId);
        return this.protocolService.getProtocolFeatures(protocolName, addresses, chain);
      }),
    );
    // Data
    allowedChains.forEach((chainId, dataIndex) => {
      const chainData = plainToClass(IntChainsDataDto, {});
      const chain: ChainDto = getChainById(chainId);
      // Chain Info
      chainData.chain = chain;
      // Protocol Features Info
      chainData.features = [...(info?.features[chain.abbr] ?? [])];
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

  async getProtocolFeaturesDataV2(
    protocolName: ProtocolName,
    chains: ChainIdEnum[],
    addresses: Address[],
  ): Promise<IntegrationsResponseV2Dto> {
    const response: IntegrationsResponseV2Dto = plainToClass(IntegrationsResponseV2Dto, {
      data: {},
      errors: [],
    });

    // handle protocol
    const protocolToProceed = this.protocolService.getProtocolByName(protocolName);
    if (!protocolToProceed) {
      response.errors.push(`Not found protocol '${protocolName}'`);
      return response;
    }

    // handle chains
    const existedProtocolChains = protocolToProceed.getInfo().chains;
    const chainsToProceed = [];
    chains.forEach((chainId) => {
      if (!existedProtocolChains.includes(ChainIdToAbbr[chainId])) {
        response.errors.push(
          `Not found protocol '${protocolName}' on ${chainId} (${ChainIdToAbbr[chainId]}) chain`,
        );
      } else if (!chainsToProceed.includes(chainId)) {
        // to avoid duplication
        chainsToProceed.push(chainId);
      }
    });

    // Protocol Info
    response.data.protocol = plainToClass(ProtocolInfoDto, protocolToProceed.getInfo());
    response.data.wallets = addresses.map((a) => {
      return plainToClass(IntegrationWalletDto, {
        address: a,
        chains: [],
      });
    });
    response.data.total = 0;

    // make a async calls to get data for all chains:
    const allData = await Promise.allSettled<any>(
      chainsToProceed.map((chainId) => {
        return this.protocolService.getProtocolFeaturesV2(
          protocolName,
          addresses,
          getChainById(chainId),
        );
      }),
    );

    chainsToProceed.forEach((chain, index) => {
      if (allData[index].status === 'fulfilled') {
        const [data, errors] = allData[index]['value'];
        if (errors) {
          response.errors = [...response.errors, errors.flat()];
        }

        data.forEach((bd) => {
          const walletData = response.data.wallets.find((w) => w.address === bd.userAddress);

          let existedChainData = walletData.chains.find((c) => c.chain.id === chain);

          if (!existedChainData) {
            const chainData = plainToClass(IntChainsDataDto, {});
            const chainDto: ChainDto = getChainById(chain);
            chainData.total = 0;
            chainData.chain = chainDto;
            chainData.features = protocolToProceed.getInfo().features[chainDto.abbr];
            existedChainData = chainData;
            walletData.chains.push(existedChainData);
          }

          if (bd.total) {
            if (FeatureEnum.borrowing === bd.feature) {
              existedChainData.total -= bd.total;
              response.data.total -= bd.total;
            } else {
              existedChainData.total += bd.total;
              response.data.total += bd.total;
            }
          }

          existedChainData[bd.feature] = { totalValue: bd.total, items: bd.items };
        });
      }
    });
    response.errors = response.errors.flat();

    return response;
  }
}
