import {
  Liquidity,
  LiquidityPoolKeysV4,
  MAINNET_OFFICIAL_LIQUIDITY_POOLS,
} from '@raydium-io/raydium-sdk';
import { Connection } from '@solana/web3.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { solanaKeysToStrings, solanaStringsToKeys } from '@app/common/utils/solana';
import { tokensWithPrices } from '@app/common/utils/solana';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';

const HALF = 0.5;

@Injectable()
export class RaydiumPools implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.raydium;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping: LiquidityPoolFeature[] = [];
  private availableDtosForConversion: Map<string, string>;
  private web3: Connection;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly priceService: PriceService,
    private readonly webProvider: Web3SolanaProviderService,
  ) {
    this.web3 = webProvider.getInstanceByChainId(this.chain);
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    if (!jobMapping.mapping || jobMapping.mapping.length === 0) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }
    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const allPools = await Liquidity.getPools(this.web3);

    const mainnetPools = allPools.filter((p) =>
      MAINNET_OFFICIAL_LIQUIDITY_POOLS.includes(p.id.toString()),
    );

    const liquidityPoolFeatures: LiquidityPoolFeature[] = [];
    for (const p of mainnetPools) {
      try {
        const [token0, token1] = await Promise.all([
          this.accountService.saveTrackingAsset(p.baseMint.toBase58(), this.chain),
          this.accountService.saveTrackingAsset(p.quoteMint.toBase58(), this.chain),
        ]);
        const lpToken = await this.accountService.saveAsset({
          address: p.lpMint.toBase58(),
          name: 'Raydium LP Token',
          symbol: token0.name + '/' + token1.name,
          decimals: 9,
          isLp: true,
          chain: this.chain,
        });
        const lpFeature = plainToClass(LiquidityPoolFeature, {
          address: p.id.toBase58(),
          name: lpToken.name,
          lpToken: plainToClass(ERC20Token, {
            address: lpToken.address,
            name: lpToken.name,
            symbol: lpToken.symbol,
            decimals: lpToken.decimals,
          }),
          tokens: [
            plainToClass(PoolTokenDto, {
              address: token0.address,
              name: token0.name,
              symbol: token0.symbol,
              decimals: token0.decimals,
              positionInPool: 0,
              weight: HALF,
            }),
            plainToClass(PoolTokenDto, {
              address: token1.address,
              name: token1.name,
              symbol: token1.symbol,
              decimals: token1.decimals,
              positionInPool: 1,
              weight: HALF,
            }),
          ],
          extra: {
            pool: solanaKeysToStrings(p),
          },
        });
        liquidityPoolFeatures.push(lpFeature);
      } catch (e) {
        this.logger.error(
          `error to build initial mapping for lp token [${p.lpMint.toBase58()}], chain [${
            this.chain
          }]`,
          this.placeholder,
        );
      }
    }

    const mappings = [];
    for (const lp of liquidityPoolFeatures) {
      mappings.push(await this.toDbMapping(lp));
    }
    jobMapping.mapping = mappings;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return jobMapping;
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
    if (toUniversalDtoName === LiquidityPoolFeature.name) {
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
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async updateWithChainData(): Promise<any[]> {
    const pricedTokenAddresses: string = Array.from(
      this.mapping.map((m) => {
        return m.tokens.map((t) => t.address);
      }),
    ).join(',');
    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
    );

    // RPC is trottling even with 2 promises in paralel
    for (const lpf of this.mapping) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pi = await Liquidity.getInfo(
        this.web3,
        solanaStringsToKeys(lpf.extra.pool) as LiquidityPoolKeysV4,
      );
      lpf.lpToken.decimals = pi.lpDecimals;
      lpf.lpToken.totalSupply = toDecimals(pi.lpSupply, pi.lpDecimals);

      lpf.tokens.forEach((t) => {
        t.reserve =
          t.positionInPool === 0
            ? toDecimals(pi.baseReserve, t.decimals)
            : toDecimals(pi.quoteReserve, t.decimals);
        t.balance = t.reserve;
      });
      lpf.tokens = tokensWithPrices(lpf.tokens, prices).map((t) => {
        t.value = t.balance * t.price;
        t.tokens = undefined;
        lpf.stats.tvl += t.value;
        return t;
      });
      lpf.extra = undefined;
    }
    return this.mapping;
  }
}
