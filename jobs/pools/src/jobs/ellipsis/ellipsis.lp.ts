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
import { CurvePoolTokenDto } from '../../microservices/dto/account/account.dto';
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
      [CurvePoolTokenDto.name, ERC20Token.name],
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
      // const tokenAddress = callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken;
      lpTokens.push(callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken.toLowerCase());
      // try {
      //   const trackedLiquidityPoolTokenData: LiquidityPoolTokenDto =
      //     await this.accountService.saveTrackingAsset(tokenAddress, this.chain);
      //   if (trackedLiquidityPoolTokenData.isLp) {
      //     this.logger.log(
      //       `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
      //       this.placeholder,
      //     );
      //     liquidityPools.push(toLiquidityPoolFeature(trackedLiquidityPoolTokenData));
      //   }
      // } catch (e) {
      //   this.logger.error(
      //     `error to get token data to account service, chain [${this.chain}], address [${tokenAddress}]`,
      //     this.placeholder,
      //   );
      // }
    }

    await Promise.all(
      ['0x151f1611b2e304ded36661f65506f9d7d172beba'].map(async (token) => {
        const trackedLiquidityPoolTokenData: CurvePoolTokenDto =
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

    // const lpTokensCalls = new Map<string, CallData>();
    // for (let i = 0; i <= lpTokens.length; i++) {
    //   lpTokensCalls.set(this.poolMinterLabel(i), {
    //     address: lpTokens[i],
    //     abi: Abis.minter,
    //     input: {
    //       data: []
    //     },
    //     output: {},
    //   });
    // }
    //
    // const lpTokensResponse = await this.multicallService.handleInBatches(lpTokensCalls, ChainIdEnum.bsc);

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

    if (toUniversalDtoName === ERC20Token.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        isLp: item.isLp,
        positionInPoos: item.positionInPool,
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
        // const lpInfo = ellipsisPoolsMap.get(lp.lpToken.address);
        lp.tokens.map((t) => {
          t.reserve = multicallRsp
            .get(this.getReservesLabel(lp.lpToken.address, t.positionInPool))
            .output.data?.toString();
          t.balance = t.reserve;
          t.price = t.isLp ? null : Number(prices[t.address]);
          t.value = t.balance * t.price;

          lp.stats.tvl += t.value;
          return t;
        });

        // const reserves = [];
        // for (let i = 0; i < lpInfo.coins; i++) {
        //   const reserve: string = multicallRsp
        //     .get(this.getReservesLabel(lp.lpToken.address, i))
        //     .output.data?.toString();
        //   reserves.push(reserve);
        // }
        // const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(lp.lpToken.address, 0)).output.data;
        // lp.tokens.map((t) => {
        //   t.reserve =
        //     t.positionInPool === 0
        //       ? toDecimals(_reserve0, t.decimals)
        //       : toDecimals(_reserve1, t.decimals);
        //   t.balance = t.reserve;
        //   t.price = Number(prices[t.address]);
        //   t.value = t.balance * t.price;
        //
        //   lp.stats.tvl += t.value;
        //   return t;
        // });

        return lp;
      }
    });

    return this.mapping;
  }

  private getCallsForPool(liquidityPoolFeature: LiquidityPoolFeature) {
    let calls = this.getReservesCallDataMap(liquidityPoolFeature.lpToken.address);

    const lpUnderlyingToken = liquidityPoolFeature.tokens.find((token) => token.isLp);

    if (lpUnderlyingToken) {
      calls = new Map<string, CallData>([
        ...calls.entries(),
        ...this.getReservesCallDataMap(lpUnderlyingToken.address).entries(),
      ]);
      calls.set(
        this.totalSupplyLabel(lpUnderlyingToken.address),
        this.getTotalSupplyCallData(lpUnderlyingToken.address),
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
    for (let i = 0; i < lpData.coins; i++) {
      calls.set(this.getReservesLabel(lpAddress, i), {
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

  private getReservesCallData(minter: string, index: number) {
    return {
      address: minter,
      abi: Abis.balances,
      input: {
        data: [index],
      },
      output: {},
    };
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
      if (m instanceof LiquidityPoolFeature) {
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

  poolMinterLabel(poolId) {
    return concatStrings(Abis.poolInfo.name, EllipsisAddresses.staker, poolId);
  }

  getReservesLabel(lpAddress: string, position: number) {
    return concatStrings(Abis.balances.name, lpAddress, position);
  }

  totalSupplyLabel(lpAddress: string) {
    return concatStrings(Abis.totalSupply.name, lpAddress);
  }
}
