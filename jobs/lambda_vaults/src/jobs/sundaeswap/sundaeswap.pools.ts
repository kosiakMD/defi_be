import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';
import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainIdEnum,
  CurrencyIdEnum,
  FeatureEnum,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Pool, PoolsResponse } from './interface';
import { AVAILABLE_POOLS_QUERY } from './queries';

@Injectable()
export class SundaeswapPools implements JobInterface {
  chain = ChainIdEnum.cardano;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.sundaeswap;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  subgraphUrl: string;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
    this.subgraphUrl = this.configService.get<string>('SUNDAESWAP_URL');
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: LiquidityPoolFeature[] = [];
    const pools = await this.getPoolInformation();
    const assets = await Promise.all(pools.map((pool) => this.saveAssets(pool)));

    for (const [assetA, assetB, assetLP] of assets) {
      const lpFeature = this.buildLiquidityPoolFeature(assetA, assetB, assetLP);
      liquidityPools.push(lpFeature);
    }

    const mapping = await Promise.all(liquidityPools.map((lp) => this.toDbMapping(lp)));

    jobMapping.mapping = mapping;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    return jobMapping;
  }

  async updateWithChainData(): Promise<NotifySupportedFeature[]> {
    const pricedTokenAddresses = this.mapping
      .flatMap((m) => m.tokens.map((t) => t.address))
      .join(',');

    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
    );

    const pools = await this.getPoolInformation().then((pools) => this.poolsToMap(pools));

    for (const lp of this.mapping) {
      if (lp instanceof LiquidityPoolFeature && pools.has(lp.address)) {
        const pool = pools.get(lp.address);

        lp.tokens[0].reserve = toDecimals(pool.quantityA, pool.assetA.decimals);
        lp.tokens[0].price = Number(prices[CARDANO_COIN_ADDRESS]);

        lp.tokens[1].reserve = toDecimals(pool.quantityB, pool.assetB.decimals);
        lp.tokens[1].price = Number(prices[this.removeDotInAssetID(pool.assetB.assetId)]);

        lp.stats.tvl = new BigNumber(pool.tvl).toNumber();
        lp.lpToken.totalSupply = toDecimals(pool.quantityLP, lp.lpToken.decimals);
        lp.stats.feeRate = Number(pool.fee);
      }
    }
    return this.mapping;
  }

  async toDbMapping(liquidityPool: LiquidityPoolFeature) {
    const mappedDTO = plainToClass(PoolsFeatureMapping, {});
    const lpTokenUniqueId = concatStrings(this.chain, liquidityPool.lpToken.address);
    const lpTokenItem = await this.getDbItem(liquidityPool.lpToken, lpTokenUniqueId);
    mappedDTO.lpToken = {
      dbId: lpTokenItem.id,
      dtoName: liquidityPool.lpToken.constructor.name,
    };

    mappedDTO.tokens = [];
    for (const t of liquidityPool.tokens) {
      const tokenId = concatStrings(this.chain, t.address);
      const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
      mappedDTO.tokens.push({
        dbId: tokenItem.id,
        dtoName: t.constructor.name,
        positionInPool: t.positionInPool,
        // weight: t.weight,
      });
    }

    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);

    mappedDTO.dbId = position.id;
    mappedDTO.dtoName = liquidityPool.constructor.name;

    return mappedDTO;
  }

  async getDbItem(item, uniqueId: string) {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId);

    if (temp) {
      return temp;
    }

    return await this.saveItemToDb(item, uniqueId);
  }

  async saveItemToDb(item, uniqueId: string) {
    let universalDto: Record<string, string> = {};

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
    const saveItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);

    TrackedVaultItemsMap.add(saveItem);
    return saveItem;
  }

  private async getPoolInformation(): Promise<Pool[]> {
    const request = this.httpService
      .post<PoolsResponse>(this.subgraphUrl, {
        query: AVAILABLE_POOLS_QUERY,
        variables: { pageSize: 200 },
      })
      .pipe(map((r) => r.data));
    const response = await firstValueFrom(request);
    return response?.data?.poolsPopular || [];
  }

  private poolsToMap(pools: Pool[]): Map<string, Pool> {
    return new Map(pools.map((pool) => [pool.assetLP.assetId, pool]));
  }

  private removeDotInAssetID(asset: string): string {
    return asset.replace(/\./, '');
  }

  private async saveAssets(pool: Pool): Promise<LiquidityPoolTokenDto[]> {
    const assetA = this.accountService.saveAsset({
      address: pool.assetA.assetId || CARDANO_COIN_ADDRESS,
      name: pool.assetA.assetName || 'ADA',
      symbol: pool.assetA.ticker,
      decimals: pool.assetA.decimals,
      chain: this.chain,
    });

    const assetB = this.accountService.saveAsset({
      address: this.removeDotInAssetID(pool.assetB.assetId),
      name: pool.assetB.assetName,
      symbol: pool.assetB.ticker,
      decimals: pool.assetB.decimals,
      chain: this.chain,
    });

    const assetLP = this.accountService.saveAsset({
      address: pool.assetLP.assetId,
      name: pool.name,
      symbol: pool.name,
      decimals: pool.assetB.decimals,
      isLp: true,
      chain: this.chain,
    });

    return Promise.all([assetA, assetB, assetLP]);
  }

  private buildLiquidityPoolFeature(
    assetA: LiquidityPoolTokenDto,
    assetB: LiquidityPoolTokenDto,
    assetLP: LiquidityPoolTokenDto,
  ): LiquidityPoolFeature {
    return plainToClass(LiquidityPoolFeature, {
      address: assetLP.address,
      name: assetLP.name,
      lpToken: plainToClass(ERC20Token, {
        address: assetLP.address,
        name: assetLP.name,
        symbol: assetLP.symbol,
        decimals: assetLP.decimals,
      }),
      tokens: [
        plainToClass(PoolTokenDto, {
          address: assetA.address,
          name: assetA.name,
          symbol: assetA.symbol,
          decimals: assetA.decimals,
        }),
        plainToClass(PoolTokenDto, {
          address: assetB.address,
          name: assetB.name,
          symbol: assetB.symbol,
          decimals: assetB.decimals,
        }),
      ],
    });
  }
}
