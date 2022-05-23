import { classToPlain, plainToClass } from 'class-transformer';

import { ChainIdEnum, FeatureEnum, PoolTokenDto } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
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
import { PoolsFeatureMapping } from '../dto/mappings';
import { Pool } from './cardano.interfaces';

export abstract class CardanoPools {
  chain = ChainIdEnum.cardano;
  feature = FeatureEnum.pools;
  placeholder: string;
  features: any;
  subgraphUrl: string;

  protected mapping = [];
  protected availableDtosForConversion: Map<string, string>;

  constructor(
    protected readonly logger: Logger,
    protected readonly storeService: StoreService,
    protected readonly accountService: AccountService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  protected abstract getPools(): Promise<Pool[]>;

  protected async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: LiquidityPoolFeature[] = [];
    const pools = await this.getPools();
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

  protected buildLiquidityPoolFeature(
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
          positionInPool: 0,
          weight: 0.5,
        }),
        plainToClass(PoolTokenDto, {
          address: assetB.address,
          name: assetB.name,
          symbol: assetB.symbol,
          decimals: assetB.decimals,
          positionInPool: 1,
          weight: 0.5,
        }),
      ],
    });
  }

  protected async toDbMapping(liquidityPool: LiquidityPoolFeature) {
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
        weight: t.weight,
      });
    }

    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);

    mappedDTO.dbId = position.id;
    mappedDTO.dtoName = liquidityPool.constructor.name;

    return mappedDTO;
  }

  protected async getDbItem(item, uniqueId: string) {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId);

    if (temp) {
      return temp;
    }

    return this.saveItemToDb(item, uniqueId);
  }

  protected async saveItemToDb(item, uniqueId: string) {
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

  protected poolsToMap(pools: Pool[]): Map<string, Pool> {
    return new Map(pools.map((pool) => [pool.assetLP.assetId, pool]));
  }

  protected async saveAssets(pool: Pool): Promise<LiquidityPoolTokenDto[]> {
    try {
      const assetA = this.accountService.saveAsset({
        address: pool.assetA.assetId || CARDANO_COIN_ADDRESS,
        name: pool.assetA.assetName || 'ADA',
        symbol: pool.assetA.ticker,
        decimals: pool.assetA.decimals,
        chain: this.chain,
      });

      const assetB = this.accountService.saveAsset({
        address: pool.assetB.assetId, //removeDotInAssetID
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
    } catch (e) {
      this.logger.error({ pool, this: this });
      throw e;
    }
  }
}
