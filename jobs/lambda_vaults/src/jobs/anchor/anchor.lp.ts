import { AddressProviderFromJson, columbus5 } from '@anchor-protocol/anchor.js';
import { LCDClient } from '@terra-money/terra.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainIdEnum,
  CurrencyIdEnum,
  FeatureEnum,
  Logger,
  PoolAssetsQueryResp,
  ProtocolNameEnum,
} from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { Setting } from '../../store/setting.entity';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toLiquidityPoolFeature } from '../../utils/conventer';
import { toDecimals } from '../../utils/number';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { JobPoolsBase } from '../job.pools.base';

@Injectable()
export class AnchorLp extends JobPoolsBase<LiquidityPoolFeature> {
  chain = ChainIdEnum.terra;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.anchor;

  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  mapping = [];
  availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly settingsService: SettingsService,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly web3ProviderService: Web3ProviderService,
  ) {
    super();
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async rebuildMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: LiquidityPoolFeature[] = [];
    const settingId = concatStrings(this.placeholder, 'chief_pool_length');

    if (jobMapping.mapping === null) {
      jobMapping.mapping = [];
    }

    let dbPoolLengthSetting: Setting = await this.settingsService.findByName(settingId);
    if (!dbPoolLengthSetting) {
      dbPoolLengthSetting = plainToClass(Setting, {});
      dbPoolLengthSetting.name = settingId;
      dbPoolLengthSetting = await this.settingsService.create(dbPoolLengthSetting);
    }

    // For today anchor integration has only one pool(Astroport ANC-UUSD)
    const poolIdTo = 1;

    const poolIdFrom = Number(dbPoolLengthSetting.value);
    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      return jobMapping;
    }

    const addressProvider = new AddressProviderFromJson(columbus5);
    const promisesExecuted = await Promise.allSettled([
      this.accountService.saveTrackingAsset(addressProvider.ancUstLPToken(), this.chain),
    ]);
    promisesExecuted.forEach((p) => {
      if (p.status === 'fulfilled') {
        const token = p.value as LiquidityPoolTokenDto;
        if (token.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${token.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toLiquidityPoolFeature(token));
        }
      } else {
        this.logger.error(
          `error to get token data to account service, chain [${this.chain}]`,
          this.placeholder,
        );
      }
    });

    const mappings = [];
    for (const lp of liquidityPools) {
      mappings.push(await this.toDbMapping(lp));
    }

    jobMapping.mapping = mappings;
    jobMapping.updatedAt = new Date();

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    dbPoolLengthSetting.value = poolIdTo;
    await this.settingsService.update(dbPoolLengthSetting);
    return updatedMapping;
  }

  async toDbMapping(liquidityPool: LiquidityPoolFeature) {
    const mappedDto = plainToClass(PoolsFeatureMapping, {});
    /** lp token */
    const lpTokenUniqueId = concatStrings(this.chain, liquidityPool.lpToken.address);
    const lpTokenItem: TrackedVaultItem = await this.getDbItem(
      liquidityPool.lpToken,
      lpTokenUniqueId,
    );
    mappedDto.lpToken = {
      dbId: lpTokenItem.id,
      dtoName: liquidityPool.lpToken.constructor.name,
    };

    /** pool tokens */
    mappedDto.tokens = [];
    for (const t of liquidityPool.tokens) {
      const tokenId = concatStrings(this.chain, t.address);
      const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
      mappedDto.tokens.push({
        dbId: tokenItem.id,
        dtoName: t.constructor.name,
        positionInPool: t.positionInPool,
        weight: t.weight,
      });
    }

    /** pool feature */
    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = liquidityPool.constructor.name;
    return mappedDto;
  }

  async getDbItem(item, uniqueId: string) {
    const temp = TrackedVaultItemsMap.get(uniqueId);
    return temp ?? (await this.saveItemToDb(item, uniqueId));
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
    if (toUniversalDtoName === LiquidityPoolFeature.name) {
      universalDto = {
        address: item.address,
        name: item.name,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);
    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async fillChainData(): Promise<LiquidityPoolFeature[]> {
    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');
    const terra: LCDClient = this.web3ProviderService.getInstanceByChainId(this.chain);

    const [{ prices }] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        this.chain,
        this.protocol,
      ),
    ]);

    this.mapping = await Promise.all(
      this.mapping.map(async (lp) => {
        const { minter } = await terra.wasm.contractQuery(lp.address, { minter: {} });
        const poolInfo: PoolAssetsQueryResp = await terra.wasm.contractQuery(minter, { pool: {} });
        lp.lpToken.totalSupply = toDecimals(poolInfo.total_share, lp.lpToken.decimals);
        lp.tokens.map((t) => {
          const assetInfo = poolInfo.assets.find(
            (asset) =>
              asset.info.token?.contract_addr === t.address ||
              asset.info.native_token?.denom === t.address,
          );
          t.reserve = t.balance = toDecimals(assetInfo.amount, t.decimals);
          t.price = Number(prices[t.address]);
          t.value = t.balance * t.price;

          lp.stats.tvl += t.value;
          return t;
        });
        return lp;
      }),
    );

    return this.mapping;
  }

  private getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof LiquidityPoolFeature) {
        m.tokens.forEach((t) => {
          addressesSet.add(t.address);
        });
      }
    });
    return addressesSet;
  }
}
