import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '../../chain/dto/call.data';
import { MulticallService } from '../../chain/multicall.service';
import { Web3Provider } from '../../chain/web3.provider';
import { ChainIdEnum, CurrencyIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { DbPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { Setting } from '../../store/setting.entity';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toCurveLiquidityPoolFeature } from '../../utils/conventer';
import { toDecimals } from '../../utils/number';
import { concatStrings } from '../../utils/string';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { ERC20Token } from '../dto/common';
import {
  CurveLiquidityPoolFeature,
  CurvePoolTokenDto,
  CurveUnderlyingLpDto,
  LiquidityPoolFeature,
  PoolsFeatureMapping,
  PoolTokenDto,
} from '../dto/pools.dto';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { PancakeAddresses } from '../pancake/addresses';
import { Abis } from './abis';
import { EllipsisAddresses } from './addresses';
import { ellipsisPoolsMap } from './util';

@Injectable()
export class EllipsisLp implements JobInterface {
  chain = ChainIdEnum.bsc;
  feature = 'pools';
  protocol = 'Ellipsis';
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly web3Provider: Web3Provider,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallService,
    private readonly priceService: PriceService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [CurveLiquidityPoolFeature.name, CurveLiquidityPoolFeature.name],
      [CurvePoolTokenDto.name, CurvePoolTokenDto.name],
      [CurveUnderlyingLpDto.name, CurveUnderlyingLpDto.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    if (!jobMapping.mapping) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: CurveLiquidityPoolFeature[] = [];
    const settingId = concatStrings(this.placeholder, 'chief_pool_length');

    let dbPoolLengthSetting: Setting = await this.settingsService.findByName(settingId);
    if (!dbPoolLengthSetting) {
      dbPoolLengthSetting = plainToClass(Setting, {});
      dbPoolLengthSetting.name = settingId;
      dbPoolLengthSetting = await this.settingsService.create(dbPoolLengthSetting);
    }

    const poolIdTo = (await this.getChainPoolLength()).toNumber() - 1;

    const poolIdFrom = Number(dbPoolLengthSetting.value);
    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      return [];
    }

    const calls = new Map<string, CallData>();
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      calls.set(this.poolInfoLabel(i), {
        address: EllipsisAddresses.staker,
        abi: Abis.poolInfo,
        input: {
          data: [i],
        },
        output: {},
      });
    }

    const callsRsp = await this.multicallService.handleInBatches(calls, ChainIdEnum.bsc);
    const lpTokens: string[] = [];

    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      lpTokens.push(callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken.toLowerCase());
    }

    await Promise.all(
      ['0x151f1611b2e304ded36661f65506f9d7d172beba'].map(async (token) => {
        const trackedLiquidityPoolTokenData: DbPoolTokenDto =
          await this.accountService.saveLikeCurveTrackingAsset(token, this.chain);
        if (trackedLiquidityPoolTokenData.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toCurveLiquidityPoolFeature(trackedLiquidityPoolTokenData));
        }
      }),
    );

    const mappings = [];
    for (const lp of liquidityPools) {
      mappings.push(await this.toDbMapping(lp));
    }

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    await this.settingsService.update(dbPoolLengthSetting);
    return updatedMapping;
  }

  async toDbMapping(liquidityPool: CurveLiquidityPoolFeature) {
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
      const mappedToken = {
        dbId: tokenItem.id,
        dtoName: t.constructor.name,
        positionInPool: t.positionInPool,
        // weight: t.weight,
      };
      if (t.lp) {
        const tokenId = concatStrings(this.chain, t.lp.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t.lp, tokenId);
        mappedToken['lp'] = {
          dbId: tokenItem.id,
          dtoName: 'CurveUnderlyingLpDto',
          positionInPool: t.lp.positionInPool,
        };
      }
      mappedDto.tokens.push(mappedToken);
    }

    /** pool feature */
    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = liquidityPool.constructor.name;
    return mappedDto;
  }

  private async getDbItem(item, uniqueId: string) {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId) as TrackedVaultItem;
    if (temp) {
      return temp;
    }
    if (!temp) {
      return await this.saveItemToDb(item, uniqueId);
    }
  }

  async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    if (toUniversalDtoName === CurvePoolTokenDto.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        isLp: item.isLp,
        lp: item.lpAddress,
      };

      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    if (toUniversalDtoName === CurveUnderlyingLpDto.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        positionInPool: item.poolId,
      };

      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

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
    if (
      toUniversalDtoName === LiquidityPoolFeature.name ||
      toUniversalDtoName === CurveLiquidityPoolFeature.name
    ) {
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

  async getChainPoolLength(): Promise<BigNumber> {
    const call = new Map<string, CallData>([
      [
        this.poolLengthLabel(),
        {
          address: EllipsisAddresses.staker,
          abi: Abis.poolLength,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
    const callRsp = await this.multicallService.handleInBatches(call, ChainIdEnum.bsc);
    return callRsp.get(this.poolLengthLabel()).output.data;
  }

  updateTracked(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();

    this.mapping.forEach((m) => {
      if (m instanceof CurveLiquidityPoolFeature) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m).entries(),
        ]);
      }
    });

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, ChainIdEnum.bsc),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.bsc),
    ]);

    this.mapping = this.mapping.map((lp) => {
      if (lp instanceof CurveLiquidityPoolFeature) {
        const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(lp.lpToken.address))
          .output.data;
        lp.lpToken.totalSupply = toDecimals(totalSupply, lp.lpToken.decimals);
        const tokensMap = this.getUnderlyingTokensMap(lp);
        tokensMap.forEach((value, key) => {
          if (Array.isArray(value)) {
            const lpUnderlyingToken = value[0].lp;
            const lpTotalSupply = multicallRsp.get(this.totalSupplyLabel(key)).output.data;
            const lpTotalSupplyDec = toDecimals(lpTotalSupply, lpUnderlyingToken.decimals);
            const lpTokenReserve = multicallRsp
              .get(this.getBalancesLabel(lp.lpToken.address, lpUnderlyingToken.positionInPool))
              .output.data?.toString();
            const lpTokenReserveDec = toDecimals(lpTokenReserve, lpUnderlyingToken.decimals);
            value.map((underlying) => {
              const underlyingReserve = multicallRsp
                .get(this.getBalancesLabel(key, underlying.positionInPool))
                .output.data?.toString();
              underlying.reserve = this.getUnderlyingTokensBalances(
                lpTokenReserveDec,
                lpTotalSupplyDec,
                toDecimals(underlyingReserve, underlying.decimals),
              );
              this.setDataToPoolToken(underlying, prices, lp);
            });
          } else {
            value.reserve = toDecimals(
              this.getTokenReserve(lp.lpToken.address, value, multicallRsp),
              value.decimals,
            );
            this.setDataToPoolToken(value, prices, lp);
          }
        });
      }
      return lp;
    });
    return this.mapping;
  }

  private getUnderlyingTokensMap(lp: CurveLiquidityPoolFeature) {
    const tokensMap: Map<string, CurvePoolTokenDto[] | CurvePoolTokenDto> = new Map();
    lp.tokens.forEach((token) => {
      if (token.lp) {
        const value = tokensMap.get(token.lp.address) as PoolTokenDto[];
        value ? value.push(token) : tokensMap.set(token.lp.address, [token]);
      } else {
        tokensMap.set(token.address, token);
      }
    });
    return tokensMap;
  }

  private getTokenReserve(
    lpAddress: string,
    underlyingToken: CurvePoolTokenDto,
    multicallRsp: Map<string, CallData>,
  ) {
    if (!ellipsisPoolsMap.get(lpAddress).minter) {
      const reserves = Object.values(
        multicallRsp.get(this.getReservesLabel(lpAddress)).output.data,
      );
      return reserves[underlyingToken.positionInPool];
    }
    return multicallRsp
      .get(this.getBalancesLabel(lpAddress, underlyingToken.positionInPool))
      .output.data?.toString();
  }

  private setDataToPoolToken(
    token: CurvePoolTokenDto,
    prices: { [key: string]: number },
    lp: CurveLiquidityPoolFeature,
  ) {
    token.balance = token.reserve;
    token.price = Number(prices[token.address]);
    token.value = token.balance * token.price;

    lp.stats.tvl += token.value;
  }

  private getUnderlyingTokensBalances(
    lpTokenReserve: number,
    lpTokenTotalSupply: number,
    underlyingReserve: number,
  ) {
    return new BigNumber(lpTokenReserve) //
      .div(lpTokenTotalSupply)
      .times(underlyingReserve)
      .toNumber();
  }

  private getCallsForPool(liquidityPoolFeature: CurveLiquidityPoolFeature) {
    let calls = this.getReservesCallDataMap(liquidityPoolFeature.lpToken.address);

    const lpUnderlyingToken = liquidityPoolFeature.tokens.filter((token) => token?.lp);

    if (lpUnderlyingToken) {
      calls = new Map<string, CallData>([
        ...calls.entries(),
        ...this.getReservesCallDataMap(lpUnderlyingToken[0].lp.address).entries(),
      ]);
      calls.set(
        this.totalSupplyLabel(lpUnderlyingToken[0].lp.address),
        this.getTotalSupplyCallData(lpUnderlyingToken[0].lp.address),
      );
    }
    // total supply supply of staking lp token

    calls.set(
      this.totalSupplyLabel(liquidityPoolFeature.lpToken.address),
      this.getTotalSupplyCallData(liquidityPoolFeature.lpToken.address),
    );

    return calls;
  }

  private getReservesCallDataMap(lpAddress: string): Map<string, CallData> {
    const lpData = ellipsisPoolsMap.get(lpAddress);
    const calls: Map<string, CallData> = new Map<string, CallData>();
    if (!lpData.minter) {
      calls.set(this.getReservesLabel(lpAddress), {
        address: lpAddress,
        abi: Abis.getReserves,
        input: {
          data: [],
        },
        output: {},
      });

      return calls;
    }
    for (let i = 0; i < lpData.coins; i++) {
      calls.set(this.getBalancesLabel(lpAddress, i), {
        address: lpData.minter,
        abi: Abis.balances,
        input: {
          data: [i],
        },
        output: {},
      });
    }
    return calls;
  }

  private getTotalSupplyCallData(lpTokenAddress: string) {
    return {
      address: lpTokenAddress,
      abi: Abis.totalSupply,
      input: {
        data: [],
      },
      output: {},
    };
  }

  private getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof LiquidityPoolFeature || m instanceof CurveLiquidityPoolFeature) {
        m.tokens.forEach((t) => {
          addressesSet.add(t.address);
        });
      }
    });
    return addressesSet;
  }

  poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, PancakeAddresses.chief);
  }

  poolInfoLabel(poolId) {
    return concatStrings(Abis.poolInfo.name, EllipsisAddresses.staker, poolId);
  }

  getBalancesLabel(lpAddress: string, position: number) {
    return concatStrings(Abis.balances.name, lpAddress, position);
  }

  getReservesLabel(lpAddress: string) {
    return concatStrings(Abis.getReserves.name, lpAddress);
  }

  totalSupplyLabel(lpAddress: string) {
    return concatStrings(Abis.totalSupply.name, lpAddress);
  }
}
