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
import { VVSAddresses } from './addresses';

@Injectable()
export class VVSPools implements JobInterface {
  chain = ChainIdEnum.cro;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.vvs;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  mappings = [];

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

  public async manageMapping(): Promise<void> {
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

  private getCallsForPool(liquidityPoolFeature: LiquidityPoolFeature) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    // reserves of lp token
    calls.set(
      this.getReservesLabel(liquidityPoolFeature),
      plainToClass(CallData, {
        address: liquidityPoolFeature.lpToken.address,
        abi: Abis.getReserves,
      }),
    );

    // total supply supply of staking lp token
    calls.set(
      this.totalSupplyLabel(liquidityPoolFeature),
      plainToClass(CallData, {
        address: liquidityPoolFeature.lpToken.address,
        abi: Abis.totalSupply,
      }),
    );

    return calls;
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
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, this.chain),
      this.multicallService.handleInBatches(batchCallsMap, this.chain),
    ]);

    this.mapping = this.mapping.map((lp) => {
      if (lp instanceof LiquidityPoolFeature) {
        const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(lp)).output.data;
        lp.lpToken.totalSupply = toDecimals(totalSupply, lp.lpToken.decimals);
        const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(lp)).output.data;
        lp.tokens.map((t) => {
          t.reserve =
            t.positionInPool === 0
              ? toDecimals(_reserve0, t.decimals)
              : toDecimals(_reserve1, t.decimals);
          t.balance = t.reserve;
          t.price = Number(prices[t.address]);
          t.value = t.balance * t.price;

          lp.stats.tvl += t.value;
          return t;
        });

        return lp;
      }
    });

    return this.mapping;
  }

  private async updateMapping(jobMapping: TrackedVault) {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: LiquidityPoolFeature[] = [];
    const settingId = concatStrings(this.placeholder, 'chief_pool_length');

    let dbPoolLenthSetting: Setting = await this.settingsService.findByName(settingId);
    if (!dbPoolLenthSetting) {
      dbPoolLenthSetting = plainToClass(Setting, {});
      dbPoolLenthSetting.name = settingId;
      dbPoolLenthSetting = await this.settingsService.create(dbPoolLenthSetting);
    }

    const poolIdTo = (await this.getChainPoolLength()).toNumber() - 1;

    const poolIdFrom = Number(dbPoolLenthSetting.value);
    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      return jobMapping;
    }

    const calls = new Map<string, CallData>();
    for (let i = poolIdFrom; i < poolIdTo; i++) {
      calls.set(
        this.poolInfoLabel(i),
        plainToClass(CallData, {
          address: VVSAddresses.chief,
          abi: Abis.poolInfo,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicallService.handleInBatches(calls, this.chain);

    const promises = [];
    for (let i = poolIdFrom; i < poolIdTo; i++) {
      const tokenAddress = callsRsp.get(this.poolInfoLabel([i])).output.data.lpToken;
      promises.push(this.accountService.saveTrackingAsset(tokenAddress, this.chain));
    }

    const promisesExecuted = await Promise.allSettled(promises);
    promisesExecuted.forEach((p: PromiseSettledResult<LiquidityPoolTokenDto>) => {
      if (p.status === 'fulfilled') {
        const token = p.value;
        if (token.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${token.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toLiquidityPoolFeature(token));
        } else {
          this.logger.error(
            `error to get token data to account service, chain [${this.chain}]`,
            this.placeholder,
          );
        }
      }
    });

    const mappings = [];
    for (let i = 0; i < liquidityPools.length; i++) {
      mappings.push(await this.toDbMapping(liquidityPools[i]));
    }

    jobMapping.mapping = mappings;
    jobMapping.updatedAt = new Date();

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    dbPoolLenthSetting.value = poolIdTo;
    await this.settingsService.update(dbPoolLenthSetting);

    return jobMapping;
  }

  async getChainPoolLength(): Promise<BigNumber> {
    const call = new Map<string, CallData>([
      [
        this.poolLengthLabel(),
        {
          address: VVSAddresses.chief,
          abi: Abis.poolLength,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);

    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return callRsp.get(this.poolLengthLabel()).output.data;
  }

  poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, VVSAddresses.chief);
  }

  poolInfoLabel(poolId) {
    return concatStrings(Abis.poolInfo.name, VVSAddresses.chief, poolId);
  }

  getReservesLabel(liquidityPoolFeature: LiquidityPoolFeature) {
    return concatStrings(Abis.getReserves.name, liquidityPoolFeature.lpToken.address);
  }

  totalSupplyLabel(liquidityPoolFeature: LiquidityPoolFeature) {
    return concatStrings(Abis.totalSupply.name, liquidityPoolFeature.lpToken.address);
  }

  private async toDbMapping(liquidityPool: LiquidityPoolFeature) {
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
    const position: TrackedVaultItem = await this.getDbItem(
      liquidityPool.lpToken,
      positionUniqueId,
    );
    mappedDto.dbId = position.id;
    mappedDto.dtoName = liquidityPool.constructor.name;
    return mappedDto;
  }

  private async getDbItem(lpToken: ERC20Token, lpTokenUniqueId: string) {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(lpTokenUniqueId) as TrackedVaultItem;
    if (temp) {
      return temp;
    }
    return await this.saveItemToDb(lpToken, lpTokenUniqueId);
  }

  private async saveItemToDb(lpToken: ERC20Token, lpTokenUniqueId: string) {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(lpToken.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    if (toUniversalDtoName === ERC20Token.name) {
      universalDto = {
        address: lpToken.address,
        name: lpToken.name,
        symbol: lpToken.symbol,
        decimals: lpToken.decimals,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = lpTokenUniqueId;
    }
    if (toUniversalDtoName === LiquidityPoolFeature.name) {
      universalDto = {
        address: lpToken.address,
        name: lpToken.name,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = lpTokenUniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);
    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  private getPricedTokensSet() {
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
}
