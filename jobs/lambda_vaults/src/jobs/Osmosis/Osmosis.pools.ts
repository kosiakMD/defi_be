import { plainToClass, classToPlain } from 'class-transformer';
import { filter, firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { ERC20TokenDto } from '../../microservices/dto/account/account.dto';
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
import { IFormatOpportunity, Pool, PoolsResponse } from './osmosis.interfaces';

const LP_DECIMALS = 18;

@Injectable()
export class OsmosisPools implements JobInterface {
  chain = ChainIdEnum.osmosis;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.osmosis;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  private pools: IFormatOpportunity[];
  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly httpService: HttpService,
    private readonly priceService: PriceService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    this.pools = await this.getPools();
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
    const addressesSet = new Set<string>();

    for (const pool of this.pools) {
      for (const token of pool.tokens) {
        if (!token.address.startsWith('gamm')) {
          addressesSet.add(token.address);
        }
      }
    }
    const assetsInDB = await this.accountService.getAssets(Array.from(addressesSet.values()), [
      this.chain,
    ]);
    const assetsMap = new Map<string, ERC20TokenDto>(assetsInDB.map((x) => [x.address, x]));

    for (const pool of this.pools) {
      if (pool.tokens.some((x) => !assetsMap.get(x.address))) {
        continue;
      }

      const tokens: PoolTokenDto[] = pool.tokens.map((token) => {
        const asset = assetsMap.get(token.address);
        return {
          ...asset,
          weight: (+token.totalWeight * 100) / +pool.totalWeight,
          reserve: +token.reserve,
          value: 0,
          balance: 0,
          price: 0,
          positionInPool: 0,
        };
      });

      const lpFeature = this.buildLiquidityPoolFeature(pool.address, tokens);
      liquidityPools.push(lpFeature);
    }
    const mapping = [];
    for (const lp of liquidityPools) {
      try {
        const result = await this.toDbMapping(lp);
        mapping.push(result);
      } catch (error) {
        this.logger.warn('There`s some problem with: ' + lp.address);
      }
    }

    jobMapping.mapping = mapping;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    return jobMapping;
  }

  async updateWithChainData(): Promise<NotifySupportedFeature[]> {
    const pricedTokenAddresses: string = this.mapping
      .flatMap((x: LiquidityPoolFeature) => x.tokens.map((t) => t.address))
      .join(',');
    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
    );

    const pools = new Map<string, IFormatOpportunity>(this.pools.map((x) => [x.address, x]));
    for (const lp of this.mapping) {
      if (lp instanceof LiquidityPoolFeature && pools.has(lp.address)) {
        const pool = pools.get(lp.address);
        let tvl = 0;

        lp.tokens.forEach((token, index) => {
          token.price = prices[token.address];
          token.reserve = toDecimals(pool.tokens[index].reserve, token.decimals);
          tvl += token.reserve * token.price;
        });

        lp.stats.tvl = tvl;
        lp.stats.feeRate = +pool.fee;
        lp.lpToken.totalSupply = toDecimals(pool.reserve, LP_DECIMALS);
      }
    }
    return this.mapping;
  }

  async toDbMapping(liquidityPool: LiquidityPoolFeature): Promise<PoolsFeatureMapping> {
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

  private async getPools(): Promise<IFormatOpportunity[]> {
    const poolURI = 'https://lcd-osmosis.keplr.app/osmosis/gamm/v1beta1/pools?pagination.limit=750';
    const $data = this.httpService.get<PoolsResponse>(poolURI).pipe(
      mergeMap((responce) => responce.data.pools),
      filter((pool) => pool.poolAssets.every((x) => +x.token.amount > 1)),
      map((pool) => this.formatOpportunity(pool)),
      toArray(),
    );
    return firstValueFrom($data);
  }

  private formatOpportunity(pool: Pool): IFormatOpportunity {
    return {
      address: pool.totalShares.denom,
      name: pool.totalShares.denom,
      reserve: pool.totalShares.amount,
      totalWeight: pool.totalWeight,
      fee: pool.poolParams.swapFee,
      tokens: pool.poolAssets.map((token) => {
        return {
          address: token.token.denom,
          reserve: token.token.amount,
          totalWeight: token.weight,
        };
      }),
    };
  }

  private buildLiquidityPoolFeature(
    lpAddress: string,
    tokens: PoolTokenDto[],
  ): LiquidityPoolFeature {
    const lpName = tokens.map((x) => x.symbol.toLocaleUpperCase()).join(' ');

    return plainToClass(LiquidityPoolFeature, {
      address: lpAddress,
      name: lpName + ' LP',
      lpToken: plainToClass(ERC20Token, {
        address: lpAddress,
        name: lpName + ' LP',
        symbol: lpName,
        decimals: LP_DECIMALS,
      }),
      tokens: tokens.map((token, index) =>
        plainToClass(PoolTokenDto, {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          positionInPool: index,
          weight: token.weight,
        }),
      ),
    });
  }
}
