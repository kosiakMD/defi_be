import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

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
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { PoolsFeatureMapping } from '../dto/mappings';
import { JobInterface } from '../job.interface';
import { JobPoolsBase } from '../job.pools.base';
import { fillUnderlyingTokens } from '../utils/token';
import { DefiKingdomsAddresses } from './addresses';
import { Abis } from './contracts/abis';

@Injectable()
export class DefiKingdomsPools extends JobPoolsBase<LiquidityPoolFeature> implements JobInterface {
  chain = ChainIdEnum.harm;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.defikingdoms;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private contract: Abis;
  protected mapping = [];
  protected availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly settingsService: SettingsService,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
    this.contract = new Abis(DefiKingdomsAddresses.masterGardener);
  }

  async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
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

    // Go throw all pools
    const calls = new Map<string, CallData>();
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      calls.set(this.poolInfoLabel(i), this.contract.poolInfo(i));
    }

    // make this call
    const callsRsp = await this.multicallService.handleInBatches(calls, this.chain);

    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      const tokenAddress = callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken;
      try {
        const trackedLiquidityPoolTokenData: LiquidityPoolTokenDto =
          await this.accountService.saveTrackingAsset(tokenAddress, this.chain);
        if (trackedLiquidityPoolTokenData.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toLiquidityPoolFeature(trackedLiquidityPoolTokenData));
        }
      } catch (e) {
        this.logger.error(
          `error to get token data to account service, chain [${this.chain}], address [${tokenAddress}]`,
          this.placeholder,
        );
      }
    }

    // add to DB
    const mappings = await Promise.all(
      liquidityPools.map(async (lp) => await this.toDbMapping(lp)),
    );

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    dbPoolLenthSetting.value = poolIdTo;
    await this.settingsService.update(dbPoolLenthSetting);
    return updatedMapping;
  }

  async toDbMapping(liquidityPool: LiquidityPoolFeature) {
    const mappedDto = plainToClass(PoolsFeatureMapping, {});
    // lp token
    const lpTokenUniqueId = concatStrings(this.chain, liquidityPool.lpToken.address);
    const lpTokenItem: TrackedVaultItem = await this.getDbItem(
      liquidityPool.lpToken,
      lpTokenUniqueId,
    );
    mappedDto.lpToken = {
      dbId: lpTokenItem.id,
      dtoName: liquidityPool.lpToken.constructor.name,
    };

    // pool tokens
    mappedDto.tokens = [];

    const promisesArr = liquidityPool.tokens.map((t) => {
      const tokenId = concatStrings(this.chain, t.address);
      return this.getDbItem(t, tokenId).then((tokenItem: TrackedVaultItem) => {
        mappedDto.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
          weight: t.weight,
        });
      });
    });

    await Promise.all(promisesArr);

    // pool feature
    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = liquidityPool.constructor.name;
    return mappedDto;
  }

  async getChainPoolLength(): Promise<BigNumber> {
    const call = new Map<string, CallData>([[this.poolLengthLabel(), this.contract.poolLength()]]);
    const callRsp = await this.multicallService.handleInBatches(call, ChainIdEnum.harm);
    return callRsp.get(this.poolLengthLabel()).output.data;
  }

  updateTracked(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async fillChainData(): Promise<LiquidityPoolFeature[]> {
    const batchCalls = [];
    this.mapping.forEach((m) => {
      if (m instanceof LiquidityPoolFeature) {
        batchCalls.push(...this.getCallsForPool(m).entries());
      }
    });

    const batchCallsMap: Map<string, CallData> = new Map<string, CallData>(batchCalls);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        ChainIdEnum.harm,
      ),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.harm),
    ]);

    this.mapping = this.mapping.map((lp) => {
      if (lp instanceof LiquidityPoolFeature) {
        const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(lp)).output.data;
        lp.lpToken.totalSupply = toDecimals(totalSupply, lp.lpToken.decimals);
        const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(lp)).output.data;
        lp.stats.tvl = fillUnderlyingTokens(lp.tokens, [_reserve0, _reserve1], prices);

        return lp;
      }
    });

    return this.mapping;
  }

  private getCallsForPool(liquidityPoolFeature: LiquidityPoolFeature) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    // reserves of lp token
    const lpContract = new Abis(liquidityPoolFeature.lpToken.address);
    calls.set(this.getReservesLabel(liquidityPoolFeature), lpContract.getReserves());

    // total supply supply of staking lp token
    calls.set(this.totalSupplyLabel(liquidityPoolFeature), lpContract.totalSupply());

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

  poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, DefiKingdomsAddresses.masterGardener);
  }

  poolInfoLabel(poolId) {
    return concatStrings(Abis.poolInfo.name, DefiKingdomsAddresses.masterGardener, poolId);
  }

  getReservesLabel(liquidityPoolFeature: LiquidityPoolFeature) {
    return concatStrings(Abis.getReserves.name, liquidityPoolFeature.lpToken.address);
  }

  totalSupplyLabel(liquidityPoolFeature: LiquidityPoolFeature) {
    return concatStrings(Abis.totalSupply.name, liquidityPoolFeature.lpToken.address);
  }
}
