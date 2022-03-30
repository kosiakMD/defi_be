import { plainToClass, classToPlain } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, PoolTokenDto, ProtocolNameEnum } from '@app/common';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Pool } from './marinade.interface';
import { MarinadeUtils } from './marinade.utils';

@Injectable()
export class MarinadePools implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.marinade;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  sonarPoolsURI: string;
  solanaTokensURI: string;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly marinadeUtils: MarinadeUtils,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    await this.marinadeUtils.initMarinadePools();

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
    const poolArray = Array.from(this.marinadeUtils.pools.values());
    const assets = await Promise.all(poolArray.map((pool) => this.saveAssets(pool)));

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
    for (const lp of this.mapping) {
      if (lp instanceof LiquidityPoolFeature && this.marinadeUtils.pools.has(lp.address)) {
        const pool = this.marinadeUtils.pools.get(lp.address);
        lp.tokens[0].reserve = pool.lp.assets[0].amount;
        lp.tokens[0].price = pool.lp.assets[0].price;
        lp.tokens[1].reserve = pool.lp.assets[1].amount;
        lp.tokens[1].price = pool.lp.assets[1].price;

        lp.lpToken.price = pool.lp.price;
        lp.lpToken.totalSupply = pool.lp.supply;
        lp.stats.tvl = pool.lp.value;
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

  private async saveAssets(pool: Pool): Promise<LiquidityPoolTokenDto[]> {
    const [$assetA, $assetB] = pool.lp.assets;
    const $assetAInfo = this.marinadeUtils.assets.get($assetA.mint);
    const $assetBInfo = this.marinadeUtils.assets.get($assetB.mint);
    const $lpInfo = this.marinadeUtils.assets.get(pool.lp.mint);

    const assetA = this.accountService.saveAsset({
      address: $assetA.mint,
      name: $assetAInfo.name,
      symbol: $assetAInfo.symbol,
      decimals: $assetAInfo.decimals,
      chain: this.chain,
    });

    const assetB = this.accountService.saveAsset({
      address: $assetB.mint,
      name: $assetBInfo.name,
      symbol: $assetBInfo.symbol,
      decimals: $assetBInfo.decimals,
      chain: this.chain,
    });

    const assetLP = this.accountService.saveAsset({
      address: pool.lp.mint,
      name: $lpInfo.name,
      symbol: $lpInfo.symbol,
      decimals: $lpInfo.decimals,
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
