import { classToPlain, plainToClass } from 'class-transformer';

import { ChainIdEnum, FeatureName, Logger, ProtocolName } from '@app/common';
import { ERC20Token } from '@app/common/dto/ERC20Token';
import { LiquidityPoolFeature } from '@app/common/dto/liquidity.pool.dto';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { CurveLiquidityPoolFeature, CurvePoolTokenDto } from '@app/common/jobs/pools';

import { SettingsService } from '../store/service/settings.service';
import { Setting } from '../store/setting.entity';
import { StoreService } from '../store/store.service';
import { TrackedVault } from '../store/tracked.vault.entity';
import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { isTimeToDo } from '../utils/time';
import { TrackedVaultItemsMap } from './data/tracked.vault.items.map';
import { TrackedVaultsMap } from './data/tracked.vaults.map';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobInterface } from './job.interface';

/**
 * Shared & Common codebase between each Job
 */
export abstract class JobBase<T extends NotifySupportedFeature> implements JobInterface {
  abstract readonly chain: ChainIdEnum;
  abstract readonly protocol: ProtocolName;
  abstract readonly feature: FeatureName;
  public readonly placeholder: string;
  protected mapping: T[] = [];
  protected availableDtosForConversion: Map<string, string>;

  // Services
  protected readonly logger: Logger;
  protected readonly settingsService: SettingsService;
  protected readonly storeService: StoreService;

  protected abstract rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault>;
  abstract updateWithChainData(): Promise<T[]>;

  public async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.rebuildMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  protected async findOrCreateSetting(settingId: string): Promise<Setting> {
    const foundSetting = await this.settingsService.findByName(settingId);
    if (foundSetting) return foundSetting;

    const newSetting = plainToClass(Setting, {
      name: settingId,
    });

    return this.settingsService.create(newSetting);
  }

  protected async getDbItem(item, uniqueId: string): Promise<TrackedVaultItem> {
    const temp = TrackedVaultItemsMap.get(uniqueId) as TrackedVaultItem;
    return temp ?? this.saveItemToDb(item, uniqueId);
  }

  protected async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    const universalDto = this.getItemAsDto(item);
    if (universalDto.name) {
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);

    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  getItemAsDto(item) {
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    switch (toUniversalDtoName) {
      case CurvePoolTokenDto.name:
        return plainToClass(CurvePoolTokenDto, {
          address: item.address,
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
          isLp: item.isLp,
          lp: item.lpAddress,
          positionInPool: null,
          totalSupply: null,
          weight: null,
          reserve: null,
          value: null,
          balance: null,
          price: null,
          tokens: item.tokens,
        } as CurvePoolTokenDto);

      case ERC20Token.name:
        return plainToClass(ERC20Token, {
          address: item.address,
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
        } as ERC20Token);

      case LiquidityPoolFeature.name:
        return plainToClass(LiquidityPoolFeature, {
          address: item.address,
          name: item.name,
        } as LiquidityPoolFeature);

      case CurveLiquidityPoolFeature.name:
        return plainToClass(CurveLiquidityPoolFeature, {
          address: item.address,
          name: item.name,
        } as CurveLiquidityPoolFeature);
    }
  }
}
