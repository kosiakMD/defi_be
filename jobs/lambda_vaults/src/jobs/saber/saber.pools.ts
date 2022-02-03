import { Connection } from '@solana/web3.js';
import { classToPlain, plainToClass } from 'class-transformer';
import { map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { tokensWithPrices } from '@app/common/utils/solana';
import { toChunkedArray } from '@app/common/utils/transform';
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
import { poolInfo, tokenInfo, rpcDataPools } from './saber.interfaces';

const HALF = 0.5;

@Injectable()
export class SaberPools implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.saber;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping: LiquidityPoolFeature[] = [];
  private availableDtosForConversion: Map<string, string>;
  private web3: Connection;
  private rpcUrl: string;
  private poolsUrl = 'https://registry.saber.so/data/pools-info.mainnet.json';

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
    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const allPools = await this.httpService
      .get(this.poolsUrl)
      .pipe(map((r) => r.data.pools))
      .toPromise();

    const liquidityPoolFeatures: LiquidityPoolFeature[] = [];

    for (const p of allPools) {
      try {
        const [token0, token1, lpToken] = await Promise.all([
          this.accountService.saveAsset({
            address: p.tokens[0].address,
            name: p.tokens[0].name,
            symbol: p.tokens[0].symbol,
            decimals: p.tokens[0].decimals,
            chain: this.chain,
          }),
          this.accountService.saveAsset({
            address: p.tokens[1].address,
            name: p.tokens[1].name,
            symbol: p.tokens[1].symbol,
            decimals: p.tokens[1].decimals,
            chain: this.chain,
          }),
          this.accountService.saveAsset({
            address: p.lpToken.address,
            name: p.lpToken.name,
            symbol: p.lpToken.symbol,
            decimals: p.lpToken.decimals,
            isLp: true,
            chain: this.chain,
          }),
        ]);

        const lpFeature = plainToClass(LiquidityPoolFeature, {
          address: p.swap.state.poolTokenMint,
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
            pool: {
              authority: p.swap.config.authority,
            },
            tokens: {
              tokenA: {
                reserve: p.swap.state.tokenA.reserve,
              },
              tokenB: {
                reserve: p.swap.state.tokenB.reserve,
              },
            },
          },
        });

        liquidityPoolFeatures.push(lpFeature);
      } catch (e) {
        this.logger.error(
          `error to build initial mapping for lp token [${p.swap.state.poolTokenMint}], chain [${this.chain}]`,
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

  async getPoolsInfo(mapping: LiquidityPoolFeature[]) {
    const config = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'jsonParsed',
    };

    const limitData = 33;
    const chunksLp = toChunkedArray(mapping, limitData);

    let responceListData = [];
    for (const chunk of chunksLp) {
      const rcpDataPools: rpcDataPools[] = [];
      let idNum = 0;
      for (const value of chunk) {
        rcpDataPools.push({
          jsonrpc: config.jsonrpc,
          id: idNum++,
          method: config.method,
          params: [value.address, { encoding: config.encoding }],
        });

        const listTokenData = value.extra.tokens;
        for (const key in listTokenData) {
          rcpDataPools.push({
            jsonrpc: config.jsonrpc,
            id: idNum++,
            method: config.method,
            params: [listTokenData[key].reserve, { encoding: config.encoding }],
          });
        }
      }

      const rpcResponse = await this.httpService
        .post(this.rpcUrl, rcpDataPools)
        .pipe(map((r) => r.data))
        .toPromise();

      responceListData = responceListData.concat(rpcResponse);
    }

    return responceListData;
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
      let pool: poolInfo;
      const tokens: tokenInfo[] = [];

      for (const value of dataLp) {
        const parsedInfo = value.result.value.data.parsed.info;
        if (parsedInfo.mintAuthority && parsedInfo.mintAuthority === lpf.extra.pool.authority) {
          pool = {
            decimals: parsedInfo.decimals,
            mintAuthority: parsedInfo.mintAuthority,
            supply: parsedInfo.supply,
          };
        } else if (parsedInfo.owner && parsedInfo.owner === lpf.extra.pool.authority) {
          tokens.push({
            mint: parsedInfo.mint,
            owner: parsedInfo.owner,
            decimals: parsedInfo.tokenAmount.decimals,
            amount: parsedInfo.tokenAmount.amount,
          });
        }
      }

      lpf.lpToken.totalSupply = toDecimals(pool.supply, pool.decimals);

      lpf.tokens.forEach((t) => {
        const token: tokenInfo = tokens.find((ts) => ts.mint === t.address);
        t.reserve = toDecimals(token.amount, t.decimals);
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
