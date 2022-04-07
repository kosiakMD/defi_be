import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { Address, ChainAbbrEnum, FeaturesResponseDto, ProtocolDataDto, ProtocolName, } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';
import {
  IntChainsDataDto,
  IntegrationsResponseV2Dto,
  IntegrationWalletDto,
  ProtocolInfoDto,
} from './dto/integrations.dto';
import { IntegrationsService } from './integrations.service';
import { PlatformService } from '../../framework/services/platform.service';
import { IUserEntryResponse } from '../../framework/support/interfaces/responses.interface';
import { getUniqList } from '@app/common/utils';
import {
  IntegrationClaimableTokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto
} from '@app/common/jobs/staking';
import { IStakingFeatureUserEntry } from '../../framework/support/interfaces/feature.staking.interface';
import { Cache } from 'cache-manager';
import { PancakeSwap } from '../../framework/platforms/PancakeSwap';
import { FeatureEnum } from '../../../../api_gateway/src/common/enum/feature.enum';

@Injectable()
export class IntegrationsServiceV3Decorator {

  protocolsV3Exceptions = new Set([
    PancakeSwap.name,
  ]);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly integrationServiceV2: IntegrationsService,
    private readonly platformService: PlatformService,
  ) {
  }

  async getProtocolsList(): Promise<FeaturesResponseDto> {
    const cachedFeatures = await this.cache.get<FeaturesResponseDto>('cached_features');
    if (cachedFeatures) {
      return cachedFeatures;
    }

    const [v2Protocols, v3Protocols] = await Promise.all([
      this.integrationServiceV2.getAllFeatures(),
      this.platformService.getProtocolList()
    ])

    const v2ProtocolsSet = new Set<string>(v2Protocols.data.map((protocolData) => protocolData.name));
    v3Protocols.forEach((v3Protocol) => {
      if (
        !v2ProtocolsSet.has(v3Protocol.name)
        && !this.protocolsV3Exceptions.has(v3Protocol.name)
      ) {
        v2Protocols.data.push(v3Protocol as ProtocolDataDto);
      }
    })

    await this.cache.set('cached_features', v2Protocols, 300);
    return v2Protocols;
  }

  async getProtocolFeaturesDataV2(
    protocolName: ProtocolName,
    chains: ChainIdEnum[],
    addresses: Address[],
  ): Promise<IntegrationsResponseV2Dto> {

    // it is not possible to get features data separately in one chain
    // it means that single chain will be processed by v2 or v3 integration if v2 is not exists
    const v2AllProtocols = await this.integrationServiceV2.getAllFeatures();
    const v2Protocol = v2AllProtocols.data.find((p) => p.name === protocolName);

    if (v2Protocol) {
      return await this.integrationServiceV2.getProtocolFeaturesDataV2(
        protocolName,
        chains,
        addresses,
      )
    }

    const v3AllProtocols = await this.platformService.getProtocolList();
    const v3Protocol = v3AllProtocols.find((p) => p.name === protocolName);
    if (v3Protocol) {
      const v3Response = await this.platformService.getUserPositionsForProtocol(
        protocolName,
        chains,
        addresses,
      );
      return IntegrationsServiceV3Decorator.toV2Response(v3Response);
    }

    return plainToClass(IntegrationsResponseV2Dto, {
      data: {},
      errors: [],
    });
  }

  static toV2Response(inputData: IUserEntryResponse): IntegrationsResponseV2Dto {

    const v3response = inputData;
    const v2Response = plainToClass(IntegrationsResponseV2Dto, {
      data: {
        protocol: {},
        wallets: [],
        total: 0,
      }
    });
    v2Response.errors = v3response.errors;

    const v2Protocol: ProtocolInfoDto = plainToClass(ProtocolInfoDto, {
      name: v3response.data.protocol.name,
      project: v3response.data.protocol.name,
      label: v3response.data.protocol.name,
    });
    v2Protocol.chains = getUniqList(v3response.data.protocol.features.map((f) => f.chain.abbr as ChainAbbrEnum));
    v2Response.data.protocol = v2Protocol;

    v2Response.data.wallets = v3response.data.wallets.map((v3Wallet) => {
      const v2Wallet = plainToClass(IntegrationWalletDto, {
        address: v3Wallet.address,
        chains: [],
      });
      v2Wallet.chains = v3Wallet.chains.map((v3WalletChain) => {
        const v2WalletChain = plainToClass(IntChainsDataDto, {
          chain: v3WalletChain.chain,
          features: v3WalletChain.features,
        })

        if (v3WalletChain.positions.staking) {
          v2WalletChain[FeatureEnum.staking] = {
            totalValue: 0,
            items: [],
          };

          v2WalletChain[FeatureEnum.staking].items = v3WalletChain.positions.staking.map((v3StakingPos) => {
            const v2Staking = IntegrationsServiceV3Decorator.stakingToV2(v3StakingPos);
            v2Response.data.total += v2Staking.stakingToken.value;
            v2WalletChain[FeatureEnum.staking].totalValue += v2Staking.stakingToken.value;
            v2Staking.rewards.forEach((r) => {
              v2Response.data.total += r.claimableData.value;
              v2WalletChain[FeatureEnum.staking].totalValue += r.claimableData.value;
            })
            return v2Staking;
          })
        }
        return v2WalletChain;
      })
      return v2Wallet;
    });

    return v2Response;
  }

  /* IStakingFeatureUserEntry */
  static stakingToV2(v3ItemPlain): IntegrationStakingPositionDto {
    const v3Item: IStakingFeatureUserEntry = v3ItemPlain as IStakingFeatureUserEntry;

    const v2Item = plainToClass(IntegrationStakingPositionDto, {});
    const lpToken = v3Item.supplied[0];

    const [ poolAddress, poolId ] = v3Item.id.split('::');

    v2Item.address = poolAddress.toLowerCase();
    v2Item.poolId = Number(poolId);
    v2Item.poolName = null;
    v2Item.staked = lpToken.totalSupplied.toString();
    v2Item.stats = {
      tvl: lpToken.tvl,
      poolApy: null,
    };
    v2Item.stakingToken.address = lpToken.token.address;

    v2Item.stakingToken.name = lpToken.token.name;
    v2Item.stakingToken.symbol = lpToken.token.symbol;
    v2Item.stakingToken.decimals = lpToken.token.decimals;
    v2Item.stakingToken.price = lpToken.token.price;
    v2Item.stakingToken.value = lpToken.value;
    v2Item.stakingToken.balance = lpToken.amount;
    v2Item.staked = lpToken.amount.toString();

    v2Item.rewards = v3Item.rewarded.map((v3RewardToken) => {
      const v2RewardToken = plainToClass(IntegrationClaimableTokenDto, {});
      v2RewardToken.address = v3RewardToken.token.address;
      v2RewardToken.name = v3RewardToken.token.name;
      v2RewardToken.symbol = v3RewardToken.token.symbol;
      v2RewardToken.decimals = v3RewardToken.token.decimals;
      v2RewardToken.price = v3RewardToken.token.price;
      v2RewardToken.claimableData.balance = v3RewardToken.amount;
      v2RewardToken.claimableData.value = v3RewardToken.value;
      v2RewardToken.apr = v3RewardToken.apr.year * 100;
      return v2RewardToken;
    });

    /* handle underlying assets */
    if (lpToken.token.underlying && lpToken.token.underlying.length !== 0) {
      v2Item.stakingToken.tokens = lpToken.token.underlying.map((u) => {
        return {
          address: u.address,
          name: u.name,
          symbol: u.symbol,
          decimals: u.decimals,
          reserve: u.reserve,
          value: u.value,
          balance: u.balance,
          price: u.price,
          positionInPool: u.position
        } as IntegrationPoolTokenDto;
      })
    }
    return v2Item;
  }
}
