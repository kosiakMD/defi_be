import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  Address,
  ChainAbbrEnum,
  FeaturesResponseDto,
  LendingPositionDto,
  ProtocolDataDto,
  ProtocolName,
} from '@app/common';
import { HealthFactorDto } from '@app/common/dto/HealthFactor.dto';
import { ChainIdEnum } from '@app/common/enum';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import {
  IntegrationClaimableTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { getUniqList } from '@app/common/utils';

import { FeatureEnum } from '../../../../api_gateway/src/common/enum/feature.enum';
import { PancakeSwap } from '../../framework/platforms/PancakeSwap';
import { PlatformService } from '../../framework/services/platform.service';
import { IClaimableFeatureUser } from '../../framework/support/interfaces/feature.claimable.interface';
import { IPoolFeatureEntryUserEntry } from '../../framework/support/interfaces/feature.pool.interface';
import { IStakingFeatureUserEntry } from '../../framework/support/interfaces/feature.staking.interface';
import { IUserEntryResponse } from '../../framework/support/interfaces/responses.interface';
import {
  IntChainsDataDto,
  IntegrationsResponseV2Dto,
  IntegrationWalletDto,
  ProtocolInfoDto,
} from './dto/integrations.dto';
import { IntegrationsService } from './integrations.service';

@Injectable()
export class IntegrationsServiceV3Decorator {
  protocolsV3Exceptions = new Set([PancakeSwap.name]);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly integrationServiceV2: IntegrationsService,
    private readonly platformService: PlatformService,
  ) {}

  async getProtocolsList(): Promise<FeaturesResponseDto> {
    const cachedFeatures = await this.cache.get<FeaturesResponseDto>('cached_features');
    if (cachedFeatures) {
      return cachedFeatures;
    }

    const [v2Protocols, v3Protocols] = await Promise.all([
      this.integrationServiceV2.getAllFeatures(),
      this.platformService.getProtocolList(),
    ]);

    const v2ProtocolsSet = new Set<string>(
      v2Protocols.data.map((protocolData) => protocolData.name),
    );
    v3Protocols.forEach((v3Protocol) => {
      if (
        !v2ProtocolsSet.has(v3Protocol.name) &&
        !this.protocolsV3Exceptions.has(v3Protocol.name)
      ) {
        v2Protocols.data.push({
          project: v3Protocol.name,
          name: v3Protocol.name,
          features: v3Protocol.features,
          links: v3Protocol.links,
        } as unknown as ProtocolDataDto);
      }
    });

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
      );
    }

    const v3AllProtocols = await this.platformService.getProtocolList();
    const v3Protocol = v3AllProtocols.find((p) => p.name === protocolName);
    if (v3Protocol) {
      const v3Response = await this.platformService.getUserPositionsForPlatform(
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
      },
    });
    v2Response.errors = v3response.errors;

    const v2Protocol: ProtocolInfoDto = plainToClass(ProtocolInfoDto, {
      name: v3response.data.protocol.name,
      project: v3response.data.protocol.name,
      label: v3response.data.protocol.name,
    });
    v2Protocol.chains = getUniqList(
      v3response.data.protocol.features.map((f) => f.chain.abbr as ChainAbbrEnum),
    );
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
        });

        if (v3WalletChain.positions.staking) {
          v2WalletChain[FeatureEnum.staking] = {
            totalValue: 0,
            items: [],
          };

          v2WalletChain[FeatureEnum.staking].items = v3WalletChain.positions.staking.map(
            (v3StakingPos) => {
              const v2Staking = IntegrationsServiceV3Decorator.stakingToV2(v3StakingPos);
              v2Response.data.total = safelyAddDecimals(
                v2Response.data.total,
                v2Staking.stakingToken.value,
              );
              v2WalletChain[FeatureEnum.staking].totalValue = safelyAddDecimals(
                v2WalletChain[FeatureEnum.staking].totalValue,
                v2Staking.stakingToken.value,
              );
              v2Staking.rewards.forEach((r) => {
                if (r.claimableData.value) {
                  v2Response.data.total = safelyAddDecimals(
                    v2Response.data.total,
                    r.claimableData.value,
                  );
                  v2WalletChain[FeatureEnum.staking].totalValue = safelyAddDecimals(
                    v2WalletChain[FeatureEnum.staking].totalValue,
                    r.claimableData.value,
                  );
                }
              });
              return v2Staking;
            },
          );
        }

        if (v3WalletChain.positions.pools) {
          v2WalletChain[FeatureEnum.pools] = { totalValue: 0, items: [] };

          v2WalletChain[FeatureEnum.pools].items = v3WalletChain.positions.pools.map(
            (liquidityV3: IPoolFeatureEntryUserEntry) => {
              const liquidityV2 = IntegrationsServiceV3Decorator.liquidityToV2(liquidityV3);
              liquidityV2.tokens?.map((token) => {
                if (token.value) {
                  v2Response.data.total = safelyAddDecimals(v2Response.data.total, token.value);
                  v2WalletChain[FeatureEnum.pools].totalValue = safelyAddDecimals(
                    v2WalletChain[FeatureEnum.pools].totalValue,
                    token.value,
                  );
                }
              });

              liquidityV2.rewards?.map((r) => {
                if (r.claimableData.value) {
                  v2Response.data.total = safelyAddDecimals(
                    v2Response.data.total,
                    r.claimableData.value,
                  );
                  v2WalletChain[FeatureEnum.pools].totalValue = safelyAddDecimals(
                    v2WalletChain[FeatureEnum.pools].totalValue,
                    r.claimableData.value,
                  );
                }
              });
              return liquidityV2;
            },
          );
        }

        if (v3WalletChain.positions.claimable) {
          v2WalletChain[FeatureEnum.claimable] = { totalValue: 0, items: [] };
          v2WalletChain[FeatureEnum.claimable].items = v3WalletChain.positions.claimable.map(
            (claimableV3: IClaimableFeatureUser) => {
              const claimableV2 = IntegrationsServiceV3Decorator.claimableToV2(claimableV3);

              v2Response.data.total = safelyAddDecimals(
                v2Response.data.total,
                claimableV2.claimableData.value,
              );
              v2WalletChain[FeatureEnum.claimable].totalValue = safelyAddDecimals(
                v2WalletChain[FeatureEnum.claimable].totalValue,
                claimableV2.claimableData.value,
              );
              return claimableV2;
            },
          );
        }

        if (v3WalletChain.positions.lending) {
          v2WalletChain.features.push(
            ...[FeatureEnum.claimable, FeatureEnum.borrowing, FeatureEnum.health],
          );

          v2WalletChain.features.forEach((feature) => {
            v3WalletChain.positions.lending.forEach((position) => {
              if (feature === FeatureEnum.health) {
                v2WalletChain[feature] = {
                  totalValue: 0,
                  items: position['debtRatio']
                    ? [
                        ...(v2WalletChain[feature]?.items || []),
                        plainToClass(HealthFactorDto, { healthFactor: position['debtRatio'] }),
                      ]
                    : [],
                };
                return;
              } else if (feature === FeatureEnum.borrowing || feature === FeatureEnum.lending) {
                const positionField =
                  feature === FeatureEnum.lending
                    ? 'supplied'
                    : feature === FeatureEnum.borrowing
                    ? 'borrowed'
                    : 'rewarded';
                const featureItems = IntegrationsServiceV3Decorator.lendingToV2(
                  position[positionField],
                );
                let totalValue = 0;
                featureItems?.forEach(
                  (featureItem) => (totalValue = safelyAddDecimals(totalValue, featureItem.value)),
                );
                v2Response.data.total = safelyAddDecimals(
                  v2Response.data.total,
                  feature === FeatureEnum.borrowing ? totalValue * -1 : totalValue,
                );
                v2WalletChain[feature] = {
                  totalValue: v2WalletChain[feature]?.totalValue
                    ? safelyAddDecimals(v2WalletChain[feature].totalValue, totalValue)
                    : totalValue,
                  items: [...(v2WalletChain[feature]?.items || []), ...featureItems] || [],
                };
              }
            });
          });
        }

        if (v3WalletChain.positions.lockedBalances) {
          v2WalletChain[FeatureEnum.lockedBalances] = {
            totalValue: 0,
            items: [],
          };

          v2WalletChain[FeatureEnum.lockedBalances].items =
            v3WalletChain.positions.lockedBalances.map((v3StakingPos) => {
              const v2Staking = IntegrationsServiceV3Decorator.stakingToV2(v3StakingPos);
              v2Response.data.total = safelyAddDecimals(
                v2Response.data.total,
                v2Staking.stakingToken.value,
              );
              v2WalletChain[FeatureEnum.lockedBalances].totalValue = safelyAddDecimals(
                v2WalletChain[FeatureEnum.lockedBalances].totalValue,
                v2Staking.stakingToken.value,
              );
              v2Staking.stakingToken.unlocked = v3StakingPos.supplied[0].unlocked;
              v2Staking.rewards?.forEach((r) => {
                if (r.claimableData.value) {
                  v2Response.data.total = safelyAddDecimals(
                    v2Response.data.total,
                    r.claimableData.value,
                  );
                  v2WalletChain[FeatureEnum.lockedBalances].totalValue = safelyAddDecimals(
                    v2WalletChain[FeatureEnum.lockedBalances].totalValue,
                    r.claimableData.value,
                  );
                }
              });
              return v2Staking;
            });
        }

        v2WalletChain.features = [...new Set(v2WalletChain.features)];

        return v2WalletChain;
      });
      return v2Wallet;
    });

    return v2Response;
  }

  static lendingToV2(v3Items): LendingPositionDto[] {
    return v3Items.map((item) => {
      const apy = item.apy?.year
        ? item.apy?.year * 100
        : item.apy?.supplyApy ??
          item.apy?.borrowApy ??
          item.apy?.stableApy ??
          item.apy?.variableApy;

      return plainToClass(LendingPositionDto, {
        address: item.token.address,
        balance: item.amount,
        value: item.value,
        apy,
        token: item.token,
      });
    });
  }

  /* IStakingFeatureUserEntry */
  static stakingToV2(v3ItemPlain): IntegrationStakingPositionDto {
    const v3Item: IStakingFeatureUserEntry = v3ItemPlain as IStakingFeatureUserEntry;

    const v2Item = plainToClass(IntegrationStakingPositionDto, {});
    const lpToken = v3Item.supplied[0];

    const [poolAddress, poolId] = v3Item.id.split('::');

    v2Item.address = poolAddress.toLowerCase();
    v2Item.poolId = Number(poolId);
    v2Item.poolName = null;
    v2Item.stats = {
      tvl: lpToken.tvl,
      poolApy: v3Item.rewarded.reduce((total, reward) => reward.apr?.year + total, 0) * 100,
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
      v2RewardToken.apr = v3RewardToken.apr?.year * 100;
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
          positionInPool: u.position,
        };
      });
    }
    return v2Item;
  }

  static claimableToV2(claimableV3: IClaimableFeatureUser): IntegrationClaimableTokenDto {
    const supplied = claimableV3.supplied[0];
    const claimableV2 = plainToClass(IntegrationClaimableTokenDto, supplied.token);

    claimableV2.claimableData = {
      balance: supplied.amount,
      value: supplied.value,
    };

    return claimableV2;
  }

  static liquidityToV2(liquidityV3: IPoolFeatureEntryUserEntry): LiquidityPoolFeature {
    const supplied = liquidityV3.supplied[0];
    const liquidityV2 = plainToClass(LiquidityPoolFeature, {});
    const { underlying, ...rest } = supplied.token;
    liquidityV2.address = liquidityV3.id;
    liquidityV2.lpToken = plainToClass(ERC20Token, rest);
    liquidityV2.tokens = plainToClass(PoolTokenDto, underlying);
    liquidityV2.tokens?.forEach((token) => {
      if (!token.positionInPool) delete token.positionInPool;
      if (!token.weight) delete token.weight;
      return token;
    });

    liquidityV2.stats.tvl = supplied.tvl;
    liquidityV2.stats.share = supplied.amount / supplied.totalSupplied;

    liquidityV2.rewards = liquidityV3.rewarded?.map((v3RewardToken) => {
      const v2RewardToken = plainToClass(IntegrationClaimableTokenDto, {});
      v2RewardToken.address = v3RewardToken.token.address;
      v2RewardToken.name = v3RewardToken.token.name;
      v2RewardToken.symbol = v3RewardToken.token.symbol;
      v2RewardToken.decimals = v3RewardToken.token.decimals;
      v2RewardToken.price = v3RewardToken.token.price;
      v2RewardToken.claimableData.balance = v3RewardToken.amount;
      v2RewardToken.claimableData.value = v3RewardToken.value;
      v2RewardToken.apr = v3RewardToken.apr?.year * 100;
      return v2RewardToken;
    });

    return liquidityV2;
  }
}

// competing es-lint rules
// eslint-disable-next-line newline-per-chained-call
const safelyAddDecimals = (dec1, dec2) => new BigNumber(dec1).plus(new BigNumber(dec2)).toNumber();
