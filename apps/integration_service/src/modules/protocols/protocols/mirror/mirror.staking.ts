import { Mirror } from '@mirror-protocol/mirror.js';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  FeatureEnum,
  IAssetResponseDto,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
  TerraswapProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { BaseDataShortFarm } from '@app/common/dto/base.data.short.farm';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationShortFarmPositionDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';

import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservices/account.service';
import { UnderlyingTokenDto } from '../ellipsis/ellipsis.staking';
import { MirrorAddresses } from './mirror.addresses';

@Injectable()
export class MirrorStaking {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const terraswapCacheKey = `${chain.id}_${TerraswapProtocolEnum.terraswap}_${FeatureEnum.pools}`;
    const terraswapPools: NotifyPools = await this.cache.get(terraswapCacheKey);

    if (!terraswapPools) {
      throw new Error(`not found cached data for key '${terraswapCacheKey}'`);
    }

    const terraswapMap = terraswapPools.items.reduce((resp, item) => {
      resp.set(item.lpToken.address, item);
      return resp;
    }, new Map());

    const balances = await this.getStakingBalances(addresses);

    const mirror = new Mirror();
    const assets = mirror.assets;
    const mirrorAssetsInfo = Object.entries(assets).reduce((resp, [, asset]) => {
      resp.set(asset.token.contractAddress, {
        tokenAddress: asset.token.contractAddress,
        poolFeature: terraswapMap.get(asset.lpToken.contractAddress),
        pairAddress: asset.pair.contractAddress,
      });
      return resp;
    }, new Map());

    const tokenAddresses: string[] = [MirrorAddresses.mirror, MirrorAddresses.terraUsd];
    balances?.forEach((userBalances) => {
      userBalances.forEach((balance) => {
        tokenAddresses.push(balance.stakingToken);
      });
    });

    const { data } = await this.accountService.getAssets(tokenAddresses, [chain.id]);
    const tokensMap = data.reduce((resp, asset) => {
      resp.set(asset.address, asset);
      return resp;
    }, new Map());

    const mirrorDb = tokensMap.get(MirrorAddresses.mirror);

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [a, this.getStakingBaseData(a, chain)]),
    );
    const baseDataShortFarmMap: Map<string, BaseDataShortFarm> = new Map(
      addresses.map((a) => [a, this.getShortFarmBaseData(a, chain)]),
    );

    for (const [key, value] of balances) {
      const staking = baseDataStakingMap.get(key);
      const shortFarm = baseDataShortFarmMap.get(key);
      await Promise.all(
        value.map(async (stakingData) => {
          const poolFeature =
            stakingData.isShort || stakingData.isGov
              ? null
              : mirrorAssetsInfo.get(stakingData.stakingToken);
          if (stakingData.isShort) {
            const { positions } = await mirror.mint.getPositions(key);
            const position = positions.find(
              (position) => position.asset.info.token.contract_addr === stakingData.stakingToken,
            );
            const lockDetails = await mirror.lock.getPositionLockInfo(position.idx);
            const stakingTokenDb = tokensMap.get(stakingData.stakingToken);
            const usdToken = tokensMap.get(MirrorAddresses.terraUsd);
            const shortFarmPosition = this.getShortFarmPosition(stakingTokenDb, usdToken, mirrorDb);
            const stakingAmountDec = toDecimals(
              stakingData.stakingBalance,
              stakingTokenDb.decimals,
            );
            shortFarmPosition.staked = String(stakingAmountDec);
            shortFarmPosition.stakingToken.balance = stakingAmountDec;

            shortFarmPosition.locked.balance = toDecimals(
              lockDetails.locked_amount,
              usdToken.decimals,
            );

            shortFarmPosition.until = new Date(lockDetails.unlock_time * 1000);

            shortFarmPosition.rewards[0].claimableData.balance = toDecimals(
              stakingData.reward,
              shortFarmPosition.rewards[0].decimals,
            );
            shortFarm.items.push(shortFarmPosition);
          } else {
            const stakingPosition = this.getStakingPosition(
              poolFeature?.poolFeature,
              mirrorDb,
              stakingData.stakingToken,
            );
            const stakedAmountDec = toDecimals(
              stakingData.stakingBalance,
              stakingPosition.stakingToken.decimals,
            );
            stakingPosition.staked = String(stakedAmountDec);
            stakingPosition.stakingToken.balance = stakedAmountDec;
            if (stakingPosition.stakingToken.tokens.length) {
              const poolShare = new BigNumber(stakedAmountDec) //
                .div(stakingPosition.stakingToken.totalSupply)
                .toString();
              stakingPosition.stakingToken.tokens.forEach((token) => {
                this.modifyUnderlyingToken(token, poolShare);
                if (token.tokens?.length) {
                  token.tokens.forEach((underlying) => {
                    this.modifyUnderlyingToken(underlying, poolShare);
                  });
                }
              });
            } else {
              stakingPosition.stakingToken = {
                ...stakingPosition.stakingToken,
                balance: stakedAmountDec,
                price: null,
                value: null,
              };
            }
            stakingPosition.rewards[0].claimableData = {
              balance: toDecimals(stakingData.reward, mirrorDb.decimals),
              value: null,
            };
            stakingPosition.rewards[0].price = null;

            staking.items.push(stakingPosition);
          }
        }),
      );
    }
    return [...baseDataStakingMap.values(), ...baseDataShortFarmMap.values()];
  }

  modifyUnderlyingToken(token: UnderlyingTokenDto, poolShare: string) {
    token.price = null;
    token.value = null;
    token.reserve = token.balance;
    token.balance = new BigNumber(poolShare) //
      .multipliedBy(token.reserve)
      .toNumber();
  }

  private getIntegrationErc20TokenDto(token: ERC20Token) {
    return plainToClass(IntegrationERC20TokenDto, {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      totalSupply: token?.totalSupply,
    });
  }

  private getStakingPosition(
    poolFeature: LiquidityPoolFeature,
    mirrorToken: IAssetResponseDto,
    assetAddress: string,
  ): IntegrationStakingPositionDto {
    const stakingToken: IntegrationERC20TokenDto = this.getIntegrationErc20TokenDto(
      poolFeature?.lpToken ?? mirrorToken,
    );

    poolFeature?.tokens.forEach((pt) => {
      const poolToken: IntegrationPoolTokenDto = plainToClass(IntegrationPoolTokenDto, {
        address: pt.address,
        name: pt.name,
        symbol: pt.symbol,
        decimals: pt.decimals,
        positionInPool: pt.positionInPool,
        reserve: pt.reserve,
        balance: pt.balance,
      });
      stakingToken.tokens.push(poolToken);
    });

    return plainToClass(IntegrationStakingPositionDto, {
      address: assetAddress,
      poolId: null,
      poolName: stakingToken.tokens?.length
        ? stakingToken.tokens
            .sort((a, b) => a.positionInPool - b.positionInPool)
            .map((pt) => pt.symbol)
            .join('/')
        : stakingToken.symbol,
      rewards: [
        plainToClass(IntegrationClaimableTokenDto, {
          address: mirrorToken.address,
          name: mirrorToken.name,
          symbol: mirrorToken.symbol,
          decimals: mirrorToken.decimals,
        }),
      ],
      stakingToken: stakingToken,
    });
  }

  private async getStakingBalances(
    addresses: string[],
  ): Promise<Map<string, MirrorStakingDataInterface[]>> {
    try {
      const mirror = new Mirror();
      const balanceMap = new Map<string, MirrorStakingDataInterface[]>();

      await Promise.all(
        addresses.map(async (address) => {
          // eslint-disable-next-line camelcase
          const [govStaking, { reward_infos }] = await Promise.all([
            mirror.gov.getStaker(address),
            mirror.staking.getRewardInfo(address),
          ]);

          const stakingBalances: MirrorStakingDataInterface[] = [];
          // eslint-disable-next-line camelcase
          reward_infos?.map(({ asset_token, bond_amount, pending_reward, is_short }) => {
            stakingBalances.push({
              stakingBalance: String(bond_amount),
              stakingToken: String(asset_token),
              reward: String(pending_reward),
              isGov: false,
              // eslint-disable-next-line camelcase
              isShort: is_short,
            });
          });

          if (Number(govStaking.balance) > 0) {
            stakingBalances.push({
              stakingBalance: String(govStaking.balance),
              stakingToken: MirrorAddresses.mirror,
              reward: String(govStaking.pending_voting_rewards),
              isShort: false,
              isGov: true,
            });
          }
          if (stakingBalances.length) {
            balanceMap.set(address, stakingBalances);
          }
        }),
      );
      return balanceMap;
    } catch (e) {
      this.logger.error(e, 'getStakingBalances');
    }
  }

  getShortFarmPosition(
    stakingTokenDb: IAssetResponseDto,
    usdToken: IAssetResponseDto,
    mirrorToken: IAssetResponseDto,
  ): IntegrationShortFarmPositionDto {
    const stakingToken = plainToClass(IntegrationERC20TokenDto, {
      address: stakingTokenDb.address,
      name: stakingTokenDb.name,
      symbol: stakingTokenDb.symbol,
      decimals: stakingTokenDb.decimals,
    });

    const locked = plainToClass(IntegrationERC20TokenDto, {
      address: usdToken.address,
      name: usdToken.name,
      symbol: usdToken.symbol,
      decimals: usdToken.decimals,
    });

    return plainToClass(IntegrationShortFarmPositionDto, {
      stakingToken: stakingToken,
      rewards: [
        plainToClass(IntegrationClaimableTokenDto, {
          address: mirrorToken.address,
          name: mirrorToken.name,
          symbol: mirrorToken.symbol,
          decimals: mirrorToken.decimals,
        }),
      ],
      locked: locked,
    });
  }

  getStakingBaseData(address: string, chain: ChainDto) {
    return plainToClass(BaseDataStaking, {
      chain: chain,
      userAddress: address,
      protocolType: ProtocolTypeEnum.staking,
      projectName: ProjectEnum.mirror,
      feature: FeatureEnum.staking,
      items: [],
    });
  }

  getShortFarmBaseData(address: string, chain: ChainDto) {
    return plainToClass(BaseDataShortFarm, {
      chain: chain,
      userAddress: address,
      protocolType: ProtocolTypeEnum.shortFarm,
      projectName: ProjectEnum.mirror,
      feature: FeatureEnum.shortFarm,
      items: [],
    });
  }
}

export interface MirrorStakingDataInterface {
  stakingBalance: string;
  stakingToken: string;
  reward?: string;
  isShort: boolean;
  isGov: boolean;
}
