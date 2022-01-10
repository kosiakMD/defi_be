import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { EllipsisMulticall } from '@app/common/jobs/ellipsis/ellipsis.multicall';
import {
  CurveLiquidityPoolFeature,
  CurveUnderlyingLpDto,
  LiquidityPoolFeature,
  PoolTokenDto,
} from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { Setting } from '../../store/setting.entity';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toCurveLiquidityPoolFeature } from '../../utils/conventer';
import { toDecimals } from '../../utils/number';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { EllipsisAddresses } from './addresses';

@Injectable()
export class EllipsisLp implements JobInterface {
  chain = ChainIdEnum.bsc;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.ellipsis;

  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly priceService: PriceService,
    private readonly web3ProviderService: Web3ProviderService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [CurveLiquidityPoolFeature.name, CurveLiquidityPoolFeature.name],
      [CurveUnderlyingLpDto.name, CurveUnderlyingLpDto.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    if (!jobMapping.mapping || jobMapping.mapping.length === 0) {
      this.logger.log('it is time to update mapping', this.placeholder);
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

    if (jobMapping.mapping === null) {
      jobMapping.mapping = [];
    }

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
      return jobMapping;
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
    const promises = [];

    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      const tokenAddress = callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken.toLowerCase();
      promises.push(this.accountService.saveTrackingAsset(tokenAddress, this.chain));
    }

    const promisesExecuted = await Promise.allSettled(promises);
    promisesExecuted.forEach((p) => {
      if (p.status === 'fulfilled') {
        const token = p.value as LiquidityPoolTokenDto;
        if (token.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${token.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toCurveLiquidityPoolFeature(token));
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

      if ((t as CurveUnderlyingLpDto).tokens) {
        const underlyingTokens = await Promise.all(
          (t as CurveUnderlyingLpDto).tokens.map(async (underlying) => {
            const underlyingId = concatStrings(this.chain, underlying.address);
            const underlyingItem: TrackedVaultItem = await this.getDbItem(underlying, underlyingId);
            return {
              dbId: underlyingItem.id,
              dtoName: underlying.constructor.name,
              positionInPool: underlying.positionInPool,
            };
          }),
        );

        mappedDto.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
          tokens: underlyingTokens,
        });
      } else {
        mappedDto.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
        });
      }
    }

    /** pool feature */
    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = liquidityPool.constructor.name;
    return mappedDto;
  }

  private async getDbItem(item, uniqueId: string) {
    const temp = TrackedVaultItemsMap.get(uniqueId);
    return temp ?? (await this.saveItemToDb(item, uniqueId));
  }

  async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

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

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();
    const ellipsisMulticall = new EllipsisMulticall(
      this.web3ProviderService.getInstanceByChainId(this.chain),
    );
    const poolsMinters = await ellipsisMulticall.getMinters(
      this.mapping.map((item) => item.address),
    );

    this.mapping.forEach((m) => {
      if (m instanceof CurveLiquidityPoolFeature) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m, poolsMinters).entries(),
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
        const tokens = [];
        lp.tokens.forEach((token) => {
          if ((token as CurveUnderlyingLpDto).tokens?.length) {
            const lpTotalSupply = multicallRsp.get(this.totalSupplyLabel(token.address)).output
              .data;
            const lpTotalSupplyDec = toDecimals(lpTotalSupply, token.decimals);
            const lpTokenReserve = multicallRsp
              .get(this.getBalancesLabel(lp.lpToken.address, token.positionInPool))
              .output.data?.toString();
            const lpTokenReserveDec = toDecimals(lpTokenReserve, token.decimals);
            (token as CurveUnderlyingLpDto).tokens.forEach((poolToken) => {
              const poolTokenReserve = multicallRsp
                .get(this.getBalancesLabel(token.address, poolToken.positionInPool))
                .output.data?.toString();
              poolToken.reserve = EllipsisLp.getUnderlyingTokensReserves(
                lpTokenReserveDec,
                lpTotalSupplyDec,
                toDecimals(poolTokenReserve, poolToken.decimals),
              );
              EllipsisLp.setDataToPoolToken(poolToken, prices, lp);
              tokens.push(poolToken);
            });
          } else {
            (token as PoolTokenDto).reserve = toDecimals(
              this.getTokenReserve(
                lp.lpToken.address,
                token as PoolTokenDto,
                multicallRsp,
                poolsMinters.get(lp.lpToken.address),
              ),
              token.decimals,
            );
            EllipsisLp.setDataToPoolToken(token as PoolTokenDto, prices, lp);
            tokens.push(token);
          }
        });
        lp.tokens = tokens;
      }
      return lp;
    });
    return this.mapping;
  }

  private getTokenReserve(
    lpAddress: string,
    underlyingToken: PoolTokenDto,
    multicallRsp: Map<string, CallData>,
    minter?: string,
  ) {
    if (!minter) {
      const reserves = Object.values(
        multicallRsp.get(this.getReservesLabel(lpAddress)).output.data,
      );
      return reserves[underlyingToken.positionInPool];
    }
    return multicallRsp
      .get(this.getBalancesLabel(lpAddress, underlyingToken.positionInPool))
      .output.data?.toString();
  }

  private static setDataToPoolToken(
    token: PoolTokenDto,
    prices: { [key: string]: number },
    lp: CurveLiquidityPoolFeature,
  ) {
    token.balance = token.reserve;
    token.price = Number(prices[token.address]);
    token.value = token.balance * token.price;

    lp.stats.tvl += token.value;
  }

  private static getUnderlyingTokensReserves(
    lpTokenReserve: number,
    lpTokenTotalSupply: number,
    underlyingReserve: number,
  ) {
    return new BigNumber(lpTokenReserve) //
      .div(lpTokenTotalSupply)
      .times(underlyingReserve)
      .toNumber();
  }

  private getCallsForPool(
    liquidityPoolFeature: CurveLiquidityPoolFeature,
    poolsMinter: Map<string, string>,
  ) {
    let calls = this.getReservesCallDataMap(
      liquidityPoolFeature.lpToken.address,
      liquidityPoolFeature.tokens.length,
      poolsMinter.get(liquidityPoolFeature.lpToken.address),
    );

    const lpUnderlyingToken = liquidityPoolFeature.tokens.find((token) => token.tokens.length);

    if (lpUnderlyingToken) {
      calls = new Map<string, CallData>([
        ...calls.entries(),
        ...this.getReservesCallDataMap(
          lpUnderlyingToken.address,
          lpUnderlyingToken.tokens.length,
          poolsMinter.get(lpUnderlyingToken.address),
        ).entries(),
      ]);
      calls.set(
        this.totalSupplyLabel(lpUnderlyingToken.address),
        EllipsisLp.getTotalSupplyCallData(lpUnderlyingToken.address),
      );
    }
    // total supply supply of staking lp token

    calls.set(
      this.totalSupplyLabel(liquidityPoolFeature.lpToken.address),
      EllipsisLp.getTotalSupplyCallData(liquidityPoolFeature.lpToken.address),
    );

    return calls;
  }

  private getReservesCallDataMap(
    lpAddress: string,
    coins: number,
    minter?: string,
  ): Map<string, CallData> {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    if (!minter) {
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
    for (let i = 0; i < coins; i++) {
      calls.set(this.getBalancesLabel(lpAddress, i), {
        address: minter,
        abi: Abis.balances,
        input: {
          data: [i],
        },
        output: {},
      });
    }
    return calls;
  }

  private static getTotalSupplyCallData(lpTokenAddress: string) {
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
      if (m instanceof CurveLiquidityPoolFeature) {
        m.tokens.forEach((t) => {
          if ((t as CurveUnderlyingLpDto).tokens) {
            (t as CurveUnderlyingLpDto).tokens.forEach((underlying) => {
              addressesSet.add(underlying.address);
            });
          }
          addressesSet.add(t.address);
        });
      }
    });
    return addressesSet;
  }

  poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, EllipsisAddresses.staker);
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
