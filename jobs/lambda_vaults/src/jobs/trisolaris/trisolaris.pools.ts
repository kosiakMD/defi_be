import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainIdEnum,
  CurrencyIdEnum,
  FeatureEnum,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
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
import { toLiquidityPoolFeature } from '../../utils/conventer';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { TrisolarisAddresses } from './addresses';
import { STABLE_USDC_USDT } from './trisolaris.const';

@Injectable()
export class TrisolarisPools implements JobInterface {
  chain = ChainIdEnum.near;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.trisolaris;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  chainPoolLengthSettings = new Map<TrisolarisAddresses, string>([
    [
      TrisolarisAddresses.MasterChefV1StakingContract,
      concatStrings(this.placeholder, 'v1_chief_pool_length'),
    ],
    [
      TrisolarisAddresses.MasterChefV2StakingContract,
      concatStrings(this.placeholder, 'v2_chief_pool_length'),
    ],
  ]);

  private mapping: LiquidityPoolFeature[] = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
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
    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.updateMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async updateMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('update mapping', this.placeholder);

    const liquidityPools: LiquidityPoolFeature[] = [];
    if (jobMapping.mapping === null) {
      jobMapping.mapping = [];
    }

    const v1PoolLengthSetting = await this.poolLengthSetting(
      TrisolarisAddresses.MasterChefV1StakingContract,
    );
    const v1PoolIdFrom = Number(v1PoolLengthSetting.value);
    const v2PoolLengthSetting = await this.poolLengthSetting(
      TrisolarisAddresses.MasterChefV2StakingContract,
    );
    const v2PoolIdFrom = Number(v2PoolLengthSetting.value);

    const v1PoolIdTo =
      (await this.getChainPoolLength(TrisolarisAddresses.MasterChefV1StakingContract)).toNumber() -
      1;
    const v2PoolIdTo =
      (await this.getChainPoolLength(TrisolarisAddresses.MasterChefV2StakingContract)).toNumber() -
      1;

    if (v1PoolIdFrom >= v1PoolIdTo && v2PoolIdFrom >= v2PoolIdTo) {
      this.logger.log(
        `not necessary to update existing mapping, db poolLengths: ${v1PoolIdFrom} and ${v2PoolIdFrom}, chain poolLengths ${v1PoolIdTo} and ${v2PoolIdTo}`,
        this.placeholder,
      );
      return jobMapping;
    }

    const v1TokenAddresses = await this.masterChefV1PoolsTokenAddresses(v1PoolIdFrom, v1PoolIdTo);
    const v2TokenAddresses = await this.masterChefV2PoolsTokenAddresses(v2PoolIdFrom, v2PoolIdTo);
    const tokenAddresses = new Set<string>([
      ...v1TokenAddresses,
      ...v2TokenAddresses,
      STABLE_USDC_USDT,
    ]);

    const promises = [];
    tokenAddresses.forEach((tokenAddress) =>
      promises.push(this.accountService.saveTrackingAsset(tokenAddress, this.chain)),
    );

    const promisesExecuted = await Promise.allSettled(promises);
    promisesExecuted.forEach((p) => {
      if (p.status === 'fulfilled') {
        const token = p.value as LiquidityPoolTokenDto;
        if (token.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${token.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toLiquidityPoolFeature(token));
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

    v1PoolLengthSetting.value = v1PoolIdTo;
    await this.settingsService.update(v1PoolLengthSetting);
    v2PoolLengthSetting.value = v2PoolIdTo;
    await this.settingsService.update(v2PoolLengthSetting);

    return jobMapping;
  }

  async poolLengthSetting(address: TrisolarisAddresses): Promise<Setting> {
    const settingId = this.chainPoolLengthSettings.get(address);
    let dbPoolLengthSetting: Setting = await this.settingsService.findByName(settingId);
    if (!dbPoolLengthSetting) {
      dbPoolLengthSetting = plainToClass(Setting, {});
      dbPoolLengthSetting.name = settingId;
      dbPoolLengthSetting = await this.settingsService.create(dbPoolLengthSetting);
    }
    return dbPoolLengthSetting;
  }

  async masterChefV1PoolsTokenAddresses(poolIdFrom, poolIdTo: number): Promise<string[]> {
    const calls = new Map<string, CallData>();
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      calls.set(
        this.poolInfoLabel(i),
        plainToClass(CallData, {
          address: TrisolarisAddresses.MasterChefV1StakingContract,
          abi: Abis.poolInfoChefV1,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicallService.handleInBatches(calls, this.chain);

    const tokenAddresses = [];
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      tokenAddresses.push(callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken);
    }
    return tokenAddresses;
  }

  async masterChefV2PoolsTokenAddresses(poolIdFrom, poolIdTo: number): Promise<string[]> {
    const calls = new Map<string, CallData>();
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      calls.set(
        this.lpTokenPoolLabel(i),
        plainToClass(CallData, {
          address: TrisolarisAddresses.MasterChefV2StakingContract,
          abi: Abis.lpTokenChefV2,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicallService.handleInBatches(calls, this.chain);

    const tokenAddresses = [];
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      tokenAddresses.push(callsRsp.get(this.lpTokenPoolLabel(i)).output.data);
    }
    return tokenAddresses;
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
    const temp = TrackedVaultItemsMap.get(uniqueId);
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

  async getChainPoolLength(address: TrisolarisAddresses): Promise<BigNumber> {
    const call = new Map<string, CallData>([
      [
        this.poolLengthLabel(address),
        plainToClass(CallData, {
          address,
          abi: Abis.poolLength,
        }),
      ],
    ]);
    const callRsp = await this.multicallService.handleInBatches(call, ChainIdEnum.near);
    return callRsp.get(this.poolLengthLabel(address)).output.data;
  }

  async updateWithChainData(): Promise<LiquidityPoolFeature[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();
    this.mapping.forEach((m) => {
      if (m instanceof LiquidityPoolFeature) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m).entries(),
        ]);
      }
    });

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        this.chain,
        this.protocol,
      ),
      this.multicallService.handleInBatches(batchCallsMap, this.chain),
    ]);

    this.mapping = this.mapping.map((lp) => {
      if (lp instanceof LiquidityPoolFeature) {
        const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(lp)).output.data;
        lp.lpToken.totalSupply = toDecimals(totalSupply, lp.lpToken.decimals);
        const reserves = multicallRsp.get(this.getReservesLabel(lp))?.output?.data;
        const { _reserve0, _reserve1 } = reserves || { _reserve0: 0, _reserve1: 0 };
        lp.tokens.map((t) => {
          t.reserve = toDecimals(t.positionInPool === 0 ? _reserve0 : _reserve1, t.decimals);
          t.balance = t.reserve;
          t.price = Number(prices[t.address]);
          t.value = t.balance * t.price;

          lp.stats.tvl += t.value; //TVL - total value locked
          return t;
        });

        return lp;
      }
    });

    return this.mapping;
  }

  private getCallsForPool(liquidityPoolFeature: LiquidityPoolFeature) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    // reserves of lp token
    if (liquidityPoolFeature.lpToken.address !== STABLE_USDC_USDT) {
      calls.set(
        this.getReservesLabel(liquidityPoolFeature),
        plainToClass(CallData, {
          address: liquidityPoolFeature.lpToken.address,
          abi: Abis.getReserves,
        }),
      );
    }

    // total supply of staking lp token
    calls.set(
      this.totalSupplyLabel(liquidityPoolFeature),
      plainToClass(CallData, {
        address: liquidityPoolFeature.lpToken.address,
        abi: Abis.totalSupply,
      }),
    );

    return calls;
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

  poolLengthLabel(address: TrisolarisAddresses) {
    return concatStrings(Abis.poolLength.name, address);
  }

  poolInfoLabel(poolId) {
    return concatStrings(
      Abis.poolInfoChefV1.name,
      TrisolarisAddresses.MasterChefV1StakingContract,
      poolId,
    );
  }

  lpTokenPoolLabel(poolId) {
    return concatStrings(
      Abis.lpTokenChefV2.name,
      TrisolarisAddresses.MasterChefV2StakingContract,
      poolId,
    );
  }

  getReservesLabel(liquidityPoolFeature: LiquidityPoolFeature) {
    return concatStrings(Abis.getReserves.name, liquidityPoolFeature.lpToken.address);
  }

  totalSupplyLabel(liquidityPoolFeature: LiquidityPoolFeature) {
    return concatStrings(Abis.totalSupply.name, liquidityPoolFeature.lpToken.address);
  }
}
