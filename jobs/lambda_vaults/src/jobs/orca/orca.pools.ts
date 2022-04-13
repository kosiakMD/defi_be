import { Connection } from '@solana/web3.js';
import { classToPlain, plainToClass } from 'class-transformer';
import { map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { IntegrationClaimableTokenDto } from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { tokensWithPrices } from '@app/common/utils/solana';
import { toChunkedArray } from '@app/common/utils/transform';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
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
import { LIMIT_DATA } from './orca.constant';
import { poolData, tokenData } from './orca.interface';
import { generateListPools } from './orca.utils';

const HALF = 0.5;

@Injectable()
export class OrcaPools implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.orca;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping: LiquidityPoolFeature[] = [];
  private availableDtosForConversion: Map<string, string>;
  private web3: Connection;
  private rpcUrl: string;
  private poolsUrl = 'https://api.orca.so/configs';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly priceService: PriceService,
    private readonly webProvider: Web3SolanaProviderService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.web3 = webProvider.getInstanceByChainId(this.chain);
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
    this.rpcUrl = this.configService.get('SOL_URL');
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (!jobMapping.mapping || jobMapping.mapping.length === 0) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }
    if (jobMapping.mapping) {
      jobMapping.mapping.forEach((jm) => {
        this.mapping.push(IntegrationDataConverter.toDTO(jm));
      });
    }
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const allData = await this.httpService
      .get(this.poolsUrl)
      .pipe(map((r) => r.data))
      .toPromise();

    const { pools, aquafarms, tokens, doubleDips } = allData;

    const poolsInfo = await generateListPools(pools, doubleDips, aquafarms, tokens);

    const liquidityPoolFeatures: LiquidityPoolFeature[] = [];

    for (const key in poolsInfo) {
      const { pool, tokens, aq } = poolsInfo[key];
      try {
        if (pool && tokens) {
          const poolTokens = tokens;
          const [token0, token1, lpToken] = await Promise.all([
            this.accountService.saveAsset({
              address: poolTokens?.tokenA?.mint,
              name: poolTokens?.tokenA?.name,
              symbol: poolTokens?.tokenA?.symbol,
              decimals: poolTokens?.tokenA?.decimals,
              chain: this.chain,
            }),
            this.accountService.saveAsset({
              address: poolTokens?.tokenB?.mint,
              name: poolTokens?.tokenB?.name,
              symbol: poolTokens?.tokenB?.symbol,
              decimals: poolTokens?.tokenB?.decimals,
              chain: this.chain,
            }),
            this.accountService.saveAsset({
              address: poolTokens?.tokenLp?.mint,
              name: poolTokens?.tokenLp?.name,
              symbol: poolTokens?.tokenLp?.symbol,
              decimals: poolTokens?.tokenLp?.decimals,
              isLp: true,
              chain: this.chain,
            }),
          ]);

          const rewardTokens: LiquidityPoolTokenDto[] = [];
          if (aq) {
            rewardTokens.push(
              await this.accountService.saveTrackingAsset(aq.rewardTokenMint, this.chain),
            );
          }

          const lpFeature = plainToClass(LiquidityPoolFeature, {
            address: pool.account,
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
            rewards: rewardTokens.map((rt) =>
              plainToClass(IntegrationClaimableTokenDto, {
                address: rt.address,
                name: rt.name,
                symbol: rt.symbol,
                decimals: rt.decimals,
              }),
            ),
            extra: {
              poolInfo: poolsInfo[key],
            },
          });
          liquidityPoolFeatures.push(lpFeature);
        }
      } catch (e) {
        this.logger.error(
          `error to build initial mapping for lp token [${pool.address}], chain [${this.chain}]`,
          this.placeholder,
        );
      }
    }

    const mapping = [];
    for (const lp of liquidityPoolFeatures) {
      mapping.push(await this.toDbMapping(lp));
    }
    jobMapping.mapping = mapping;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    return jobMapping;
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
        weight: t.weight,
      });
    }

    const rewardTokens = [];
    for (const rt of liquidityPool.rewards) {
      const uid = concatStrings(this.chain, rt.address);
      const rtItem: TrackedVaultItem = await this.getDbItem(rt, uid);
      rewardTokens.push({
        dbId: rtItem.id,
        dtoName: rt.constructor.name,
      });
    }
    mappedDTO.rewards = rewardTokens;

    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);

    mappedDTO.dbId = position.id;
    mappedDTO.dtoName = liquidityPool.constructor.name;

    return mappedDTO;
  }

  async getDbItem(item, uniqueId: string) {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId) as TrackedVaultItem;

    if (temp) {
      return temp;
    }

    return await this.saveItemToDb(item, uniqueId);
  }

  async saveItemToDb(item, uniqueId: string) {
    let universalDto: {
      address: string;
      name: string;
      symbol?: string;
      decimals?: number;
      extra?: Record<string, { [key: string]: any }>;
    };

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
    const saveItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);

    TrackedVaultItemsMap.add(saveItem);
    return saveItem;
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
    const dataLp = await this.getPoolsInfo(this.mapping);

    for (const lpf of this.mapping) {
      let pool: poolData;
      const tokens: tokenData[] = [];

      for (const value of dataLp) {
        if (value.result?.value?.data?.parsed?.info) {
          const parsed = value.result.value.data.parsed.info;
          if (lpf.extra.poolInfo.pool.authority === parsed.owner) {
            tokens.push({
              mint: parsed.mint,
              owner: parsed.owner,
              amount: parsed.tokenAmount.amount,
              decimals: parsed.tokenAmount.decimals,
            });
          } else if (lpf.extra.poolInfo.pool.authority === parsed.mintAuthority) {
            pool = {
              decimals: parsed.decimals,
              mintAuthority: parsed.mintAuthority,
              supply: parsed.supply,
            };
          }
        }
      }

      lpf.lpToken.totalSupply = toDecimals(pool.supply, pool.decimals);

      lpf.tokens.forEach((t) => {
        const token = tokens.find((ts) => ts.mint === t.address);
        t.reserve = toDecimals(token.amount, t.decimals);
        t.balance = t.reserve;
      });

      lpf.tokens = tokensWithPrices(lpf.tokens, prices).map((t) => {
        t.value = t.balance * t.price;
        t.tokens = undefined;
        lpf.stats.tvl += t.value;
        return t;
      });
    }

    return this.mapping;
  }

  async getPoolsInfo(mapping: LiquidityPoolFeature[]) {
    const config = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'jsonParsed',
    };

    let index = 0;
    const rcpDataPools = [];
    for (const m of mapping) {
      const lp = {
        jsonrpc: config.jsonrpc,
        id: index++,
        method: config.method,
        params: [m.extra.poolInfo.pool.poolTokenMint, { encoding: config.encoding }],
      };
      const tokenA = {
        jsonrpc: config.jsonrpc,
        id: index++,
        method: config.method,
        params: [m.extra.poolInfo.pool.tokenAccountA, { encoding: config.encoding }],
      };
      const tokenB = {
        jsonrpc: config.jsonrpc,
        id: index++,
        method: config.method,
        params: [m.extra.poolInfo.pool.tokenAccountB, { encoding: config.encoding }],
      };

      rcpDataPools.push(...[lp, tokenA, tokenB]);
    }

    const responceListData = [];
    const chunksLp = toChunkedArray(rcpDataPools, LIMIT_DATA);
    for (const chunk of chunksLp) {
      const rpcResponse = await this.httpService
        .post(this.rpcUrl, chunk)
        .pipe(map((r) => r.data))
        .toPromise();
      responceListData.push(...rpcResponse);
    }

    return responceListData;
  }
}
