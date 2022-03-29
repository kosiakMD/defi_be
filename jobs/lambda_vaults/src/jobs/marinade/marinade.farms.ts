import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Farm } from './marinade.interface';
import { MarinadeUtils } from './marinade.utils';

@Injectable()
export class MarinadeFarms implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.farming;
  protocol = ProtocolNameEnum.marinade;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping: IntegrationStakingPositionDto[] = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly marinadeUtils: MarinadeUtils,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    await this.marinadeUtils.initMarinadeFarms();

    if (!jobMapping.mapping || jobMapping.mapping.length === 0) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }
    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];
    const farms = await Promise.allSettled(
      Array.from(this.marinadeUtils.farms.values()).map((farm) => this.saveAssets(farm)),
    );

    const [data] = handlePromiseAllSettled(farms);

    const filteredByNULL = data.filter((farm) => farm !== null);

    for (const { farm, lp, assets, rewards } of filteredByNULL) {
      const stakingFeature = plainToClass(IntegrationStakingPositionDto, {
        address: farm.address,
        stakingToken: plainToClass(IntegrationERC20TokenDto, {
          address: lp.address,
          name: lp.name,
          symbol: lp.symbol,
          decimals: lp.decimals,
          tokens: assets.map((asset) => {
            return plainToClass(IntegrationPoolTokenDto, {
              address: asset.address,
              name: asset.name,
              symbol: asset.symbol,
              decimals: asset.decimals,
            });
          }),
        }),

        rewards: rewards.map((reward) =>
          plainToClass(IntegrationClaimableTokenDto, {
            address: reward.address,
            name: reward.name,
            symbol: reward.symbol,
            decimals: reward.decimals,
          }),
        ),
      });
      stakingFeatures.push(stakingFeature);
    }

    const mappings = await Promise.allSettled(stakingFeatures.map((lp) => this.toDbMapping(lp)));
    const [settledMappings] = handlePromiseAllSettled(mappings);

    jobMapping.mapping = settledMappings;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return jobMapping;
  }

  private async toDbMapping(stakingFeature: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    /** reward tokens */
    const rewardTokens = [];
    for (const rt of stakingFeature.rewards) {
      const uid = concatStrings(this.chain, rt.address);
      const rtItem: TrackedVaultItem = await this.getDbItem(rt, uid);
      rewardTokens.push({
        dbId: rtItem.id,
        dtoName: rt.constructor.name,
      });
    }
    mappedDto.rewards = rewardTokens;

    /** lp tokens */
    const lpTokens = [];
    for (const st of stakingFeature.stakingToken.tokens) {
      const uid = concatStrings(this.chain, st.address);
      const rtItem: TrackedVaultItem = await this.getDbItem(st, uid);
      lpTokens.push({
        dbId: rtItem.id,
        dtoName: st.constructor.name,
        positionInPool: st.positionInPool,
      });
    }
    /** staking token */
    const stUid = concatStrings(this.chain, stakingFeature.stakingToken.address);
    const stItem = await this.getDbItem(stakingFeature.stakingToken, stUid);

    mappedDto.stakingToken = {
      dbId: stItem.id,
      dtoName: stakingFeature.stakingToken.constructor.name,
      tokens: lpTokens,
    };

    const stftUid = concatStrings(this.chain, stakingFeature.address, 'st');
    const stftItem: TrackedVaultItem = await this.getDbItem(stakingFeature, stftUid);

    mappedDto.dbId = stftItem.id;
    mappedDto.dtoName = stakingFeature.constructor.name;
    return mappedDto;
  }

  private async getDbItem(item, uniqueId: string) {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId);
    if (temp) {
      return temp;
    }
    return await this.saveItemToDb(item, uniqueId);
  }

  async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    if (toUniversalDtoName === ERC20Token.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }
    if (toUniversalDtoName === IntegrationStakingPositionDto.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        extra: item.extra,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);
    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async updateWithChainData(): Promise<any[]> {
    for (const farming of this.mapping) {
      const farm = this.marinadeUtils.farms.get(farming.address);
      if (!farm) continue;

      farming.stakingToken.totalSupply = farm.lp.supply;
      farming.stats.poolApy = farm.apr;
      farming.stats.tvl = farm.lp.value;
      farming.stakingToken.price = farm.lp.price;
      farming.stakingToken.value = farm.lp.value;
      farming.stakingToken.balance = farm.lp.amount;
      farming.stakingToken.decimals = farm.lp.decimals;

      farming.stakingToken.tokens.forEach((stakingToken) => {
        const token = farm.lp.assets.find((asset) => {
          if (asset.mint === '11111111111111111111111111111111')
            asset.mint = 'So11111111111111111111111111111111111111112';
          return asset.mint === stakingToken.address;
        });

        stakingToken.reserve = token.amount;
        stakingToken.price = token.price;
        stakingToken.value = token.value;
      });

      farming.rewards.forEach((stakingRewards) => {
        const reward = farm.rewardAssets.find((reward) => reward.mint === stakingRewards.address);
        stakingRewards.price = reward.price;
      });

      farming.extra = {
        famineTs: farm.additional.famineTs,
        replicaMint: farm.additional.replicaMint,
        lastUpdateTs: farm.additional.lastUpdateTs,
        annualRewardsRate: farm.additional.annualRewardsRate,
        rewardsPerTokenStored: farm.additional.rewardsPerTokenStored,
        totalTokensDeposited: farm.additional.totalTokensDeposited,
      };
    }

    return this.mapping;
  }

  private async saveAssets(farm: Farm): Promise<{
    farm: Farm;
    lp: LiquidityPoolTokenDto;
    assets: LiquidityPoolTokenDto[];
    rewards: LiquidityPoolTokenDto[];
  }> {
    const $rewards = farm.rewardAssets;
    const $assets = farm.lp.assets.map((asset) => {
      if (asset.mint === '11111111111111111111111111111111')
        asset.mint = 'So11111111111111111111111111111111111111112';
      return asset;
    });

    const $lpInfo = this.marinadeUtils.assets.get(farm.lp.mint);

    const LP = this.accountService.saveAsset({
      address: farm.lp.mint,
      name: $lpInfo?.name || '',
      symbol: $lpInfo?.symbol || '',
      decimals: $lpInfo?.decimals || farm.lp.decimals,
      isLp: true,
      chain: this.chain,
    });

    const assets = $assets.map((asset) => {
      const $assetInfo = this.marinadeUtils.assets.get(asset.mint);
      return this.accountService.saveAsset({
        address: $assetInfo.address,
        name: $assetInfo.name,
        symbol: $assetInfo.symbol,
        decimals: $assetInfo.decimals,
        chain: this.chain,
      });
    });

    const rewards = $rewards.map((reward) => {
      return this.accountService.saveTrackingAsset(reward.mint, this.chain);
    });

    const indexes = { assets: 1 + assets.length, rewards: 1 + assets.length + rewards.length };

    const result = await Promise.all([LP, ...assets, ...rewards]);

    const lpResult = result[0];
    const assetsResult = result.slice(1, indexes.assets);
    const rewardsResult = result.slice(indexes.assets, indexes.rewards);

    return { farm, lp: lpResult, assets: assetsResult, rewards: rewardsResult };
  }
}
