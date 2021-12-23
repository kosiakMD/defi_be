import { classToPlain, plainToClass } from 'class-transformer';

import { Address, ChainIdEnum, FeatureName, Logger, ProtocolName } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { ERC20Token } from '@app/common/dto/ERC20Token';
import { LiquidityPoolFeature } from '@app/common/dto/liquidity.pool.dto';
import { CurrencyIdEnum } from '@app/common/enum/chain.enum';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { CurveLiquidityPoolFeature, CurvePoolTokenDto } from '@app/common/jobs/pools';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../microservices/account.service';
import { PriceService } from '../microservices/price.service';
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
  protected abstract readonly logger: Logger;
  protected abstract readonly accountService: AccountService;
  protected abstract readonly multicallService: MulticallAggregator;
  protected abstract readonly priceService: PriceService;
  protected abstract readonly storeService: StoreService;

  protected abstract rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault>;
  abstract fillChainData?(): Promise<T[]>;

  /**
   * Checks if the database mapping needs to be updated, & updates if required
   */
  public async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log(`Updating Mapping`, this.placeholder);
      jobMapping = await this.rebuildMapping(jobMapping);
    }

    try {
      jobMapping.mapping.forEach((jm) => {
        this.mapping.push(IntegrationDataConverter.toDTO(jm));
      });
    } catch {
      this.logger.error(
        `Failed to update mapping for ${this.protocol}. Is Mapping null?`,
        this.placeholder,
      );
    }
  }

  /**
   * Takes the current mapping, and fills in
   * prices, values, total reserves, tvl etc
   */
  async updateWithChainData(): Promise<T[]> {
    if (!this.mapping?.length) {
      this.logger.warn(`Mapping is empty. Skipping`, this.placeholder);
      return [];
    }

    if (this.fillChainData) {
      return await this.fillChainData();
    }
  }

  /**
   * Service Helpers
   */
  protected saveAssets(addresses: Address[]) {
    return Promise.allSettled(addresses.map((address) => this.saveAsset(address)));
  }

  protected saveAsset(address: Address) {
    return this.accountService.saveTrackingAsset(address, this.chain);
  }

  protected async fetchPrices(addresses: Address[]) {
    const { prices } = await this.priceService.getCurrentPrices(
      addresses,
      CurrencyIdEnum.usd,
      this.chain,
    );

    return new Map(Object.entries(prices));
  }

  protected async fetchPrice(address: Address) {
    const { prices } = await this.priceService.getCurrentPrices(
      [address],
      CurrencyIdEnum.usd,
      this.chain,
    );

    return prices[address];
  }

  protected multicall(calls: Map<string, CallData>): Promise<Map<string, CallData>> {
    return this.multicallService.handleInBatches(calls, this.chain);
  }

  protected async getDbItem(item, uniqueId: string): Promise<TrackedVaultItem> {
    const temp = TrackedVaultItemsMap.get(uniqueId) as TrackedVaultItem;
    return temp ?? this.saveItemToDb(item, uniqueId);
  }

  protected async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    const newIntegrationJobItem = plainToClass(TrackedVaultItem, {});
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

  // // TODO: this is curve specific. remove
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
