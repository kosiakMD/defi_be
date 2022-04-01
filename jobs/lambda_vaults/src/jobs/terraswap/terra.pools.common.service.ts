import { LCDClient } from '@terra-money/terra.js';
import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainIdEnum,
  CurrencyIdEnum,
  FactoryPairsInfoResp,
  FeatureEnum,
  Logger,
  PoolAssetsQueryResp,
  PoolTokenDto,
} from '@app/common';
import { ERC20Token } from '@app/common/dto/ERC20Token';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { concatStrings } from '@app/common/utils';
import { toChunkedArray } from '@app/common/utils/transform';
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
export class TerraPoolsCommon extends JobPoolsBase<LiquidityPoolFeature> {
  chain = ChainIdEnum.terra;
  factory;
  totalSupplyLimit;
  feature = FeatureEnum.pools;
  protocol;
  placeholder;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly settingsService: SettingsService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly web3Provider: Web3ProviderService,
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

    const pools: FactoryPairsInfoResp[] = await this.getTerraPools();
    const poolIdTo = pools.length;
    const poolsMap = pools.reduce((resp, pool) => {
      resp.set(pool.liquidity_token, pool);
      return resp;
    }, new Map());

    const poolIdFrom = Number(dbPoolLengthSetting.value);
    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      return jobMapping;
    }

    const promisesExecuted = await Promise.allSettled(
      pools.map((pool) => {
        return this.accountService.saveTrackingAsset(
          pool.liquidity_token.toLowerCase(),
          this.chain,
        );
      }),
    );

    promisesExecuted.forEach((p) => {
      if (p.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const token = p.value as LiquidityPoolTokenDto;
        if (token.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${token.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          const liquidityFeature = toLiquidityPoolFeature(token);
          liquidityFeature.address = poolsMap.get(token.address).contract_addr;
          liquidityPools.push(liquidityFeature);
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
      delete lp.rewards;
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

  async getTerraPools() {
    const terra = this.web3ProviderService.getInstanceByChainId(this.chain);
    const pairsResp = [];
    const { pairs } = await terra.wasm.contractQuery(this.factory, {
      pairs: { limit: 30 },
    });
    pairsResp.push(...pairs);
    let flag = true;

    while (flag) {
      try {
        const { pairs } = await terra.wasm.contractQuery(this.factory, {
          // eslint-disable-next-line camelcase
          pairs: { start_after: pairsResp[pairsResp.length - 1].asset_infos, limit: 30 },
        });
        pairsResp.push(...pairs);
        if (!pairs.length) flag = false;
      } catch (e) {
        flag = false;
      }
    }

    const chunkedPairs = toChunkedArray(pairsResp, 50);

    const resultPairs = [];

    for (const pairs of chunkedPairs) {
      await Promise.all(
        pairs.map(async (pair) => {
          const tokenInfo = await this.getTokenInfo(pair.liquidity_token, terra);
          if (
            new BigNumber(tokenInfo?.total_supply) //
              .div(10 ** tokenInfo?.decimals)
              .toNumber() > this.totalSupplyLimit
          )
            resultPairs.push(pair);
        }),
      );
    }
    return resultPairs;
  }

  async getTokenInfo(token: string, terra: LCDClient) {
    try {
      return await terra.wasm.contractQuery(token, {
        // eslint-disable-next-line camelcase
        token_info: {},
      });
    } catch (e) {
      this.logger.error('Unable to get token information');
      return await this.getTokenInfo(token, terra);
    }
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
    delete mappedDto.rewards;
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
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, this.chain),
    ]);

    this.mapping = await Promise.all(
      this.mapping.map(async (lp) => {
        const poolInfo: PoolAssetsQueryResp = await terra.wasm.contractQuery(lp.address, {
          pool: {},
        });
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
