import { Connection, PublicKey } from '@solana/web3.js';
import { classToPlain, plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings, objToString } from '@app/common/utils';
import { toBN } from '@app/common/utils/number';
import { solanaKeysToStrings, tokensWithPrices } from '@app/common/utils/solana';
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
import { StakingFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { tokenInfo, rpcDataPools, poolData } from './saber.interfaces';
import { quarryMineStruct } from './saber.struct';

@Injectable()
export class SaberStaking implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.saber;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping: IntegrationStakingPositionDto[] = [];
  private availableDtosForConversion: Map<string, string>;
  private web3: Connection;
  private poolsUrl = 'https://registry.saber.so/data/pools-info.mainnet.json';
  private rpcUrl: string;

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
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
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

    const farmsListData = await this.httpService
      .get(this.poolsUrl)
      .pipe(map((r) => r.data))
      .toPromise();

    const farms = farmsListData.pools;
    const addressesFarms = farmsListData.addresses;
    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    for (const farm of farms) {
      try {
        const [token0, token1, lpToken] = await Promise.all([
          this.accountService.saveAsset({
            address: farm.tokens[0].address,
            name: farm.tokens[0].name,
            symbol: farm.tokens[0].symbol,
            decimals: farm.tokens[0].decimals,
            chain: this.chain,
          }),
          this.accountService.saveAsset({
            address: farm.tokens[1].address,
            name: farm.tokens[1].name,
            symbol: farm.tokens[1].symbol,
            decimals: farm.tokens[1].decimals,
            chain: this.chain,
          }),
          this.accountService.saveAsset({
            address: farm.lpToken.address,
            name: farm.lpToken.name,
            symbol: farm.lpToken.symbol,
            decimals: farm.lpToken.decimals,
            isLp: true,
            chain: this.chain,
          }),
        ]);

        const rewardToken: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          addressesFarms.sbr,
          this.chain,
        );
        const stakingFeature = plainToClass(IntegrationStakingPositionDto, {
          address: farm.quarry,
          stakingToken: plainToClass(IntegrationERC20TokenDto, {
            address: lpToken.address,
            name: lpToken.name,
            symbol: lpToken.symbol,
            decimals: lpToken.decimals,
            tokens: [
              plainToClass(IntegrationPoolTokenDto, {
                address: token0.address,
                name: token0.name,
                symbol: token0.symbol,
                decimals: token0.decimals,
                positionInPool: 0,
                weight: 0.5,
              }),
              plainToClass(IntegrationPoolTokenDto, {
                address: token1.address,
                name: token1.name,
                symbol: token1.symbol,
                decimals: token1.decimals,
                positionInPool: 1,
                weight: 0.5,
              }),
            ],
          }),
          rewards: [
            plainToClass(IntegrationClaimableTokenDto, {
              address: rewardToken.address,
              name: rewardToken.name,
              symbol: rewardToken.symbol,
              decimals: rewardToken.decimals,
            }),
          ],
          extra: {
            addresses: solanaKeysToStrings(addressesFarms),
            pool: farm,
          },
        });
        stakingFeatures.push(stakingFeature);
      } catch (e) {
        this.logger.error(
          `error to build initial mapping for farm [${farm.id} / ${farm.quarry}], chain [${this.chain}]`,
          this.placeholder,
        );
      }
    }

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.toDbMapping(stakingFeatures[i]));
    }
    jobMapping.mapping = mappings;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async toDbMapping(stakingFeature: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    /** reward tokens */
    const rewardTokens = [];
    for (const rt of stakingFeature.rewards) {
      const uid = concatStrings(this.chain, rt.address);
      const rtItem: TrackedVaultItem = await this.getDbItem(rt, uid);
      rewardTokens.push({
        dbId: rtItem.id,
        dtoName: rt.constructor.name,
      });
    }
    mappedDto.rewards = rewardTokens;

    /** lp tokens */
    const lpTokens = [];
    for (const st of stakingFeature.stakingToken.tokens) {
      const uid = concatStrings(this.chain, st.address);
      const rtItem: TrackedVaultItem = await this.getDbItem(st, uid);
      lpTokens.push({
        dbId: rtItem.id,
        dtoName: st.constructor.name,
        positionInPool: st.positionInPool,
      });
    }
    /** staking token */
    const stUid = concatStrings(this.chain, stakingFeature.stakingToken.address);
    const stItem = await this.getDbItem(stakingFeature.stakingToken, stUid);

    mappedDto.stakingToken = {
      dbId: stItem.id,
      dtoName: stakingFeature.stakingToken.constructor.name,
      tokens: lpTokens,
    };

    const stftUid = concatStrings(this.chain, stakingFeature.address, 'st');
    const stftItem: TrackedVaultItem = await this.getDbItem(stakingFeature, stftUid);

    mappedDto.dbId = stftItem.id;
    mappedDto.dtoName = stakingFeature.constructor.name;
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
    if (toUniversalDtoName === IntegrationStakingPositionDto.name) {
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
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async updateWithChainData(): Promise<any[]> {
    const pubKey = [];
    this.mapping.forEach((m) => {
      pubKey.push(new PublicKey(m.extra.pool.quarry));
    });
    const rpcInfo = await this.web3.getMultipleAccountsInfo(pubKey);

    for (const key in this.mapping) {
      if (!rpcInfo[key]) {
        continue;
      }
      this.mapping[key].extra.quarryInfo = objToString(quarryMineStruct.decode(rpcInfo[key].data));
    }

    const tokenAddresses = [];
    this.mapping.forEach((m) => {
      if (m.stakingToken.tokens.length > 0) {
        m.stakingToken.tokens.forEach((t) => {
          tokenAddresses.push(t.address);
        });
      } else {
        tokenAddresses.push(m.stakingToken.address);
      }
    });

    const pricedTokenAddresses: string = tokenAddresses.join(',');

    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
    );

    const resPoolInfo = await this.getPoolsInfo(this.mapping);

    for (const index in this.mapping) {
      const mapping: IntegrationStakingPositionDto = this.mapping[index];
      if (!mapping.extra.quarryInfo) {
        continue;
      }
      mapping.staked = mapping.extra.quarryInfo.totalTokensDeposited;

      const poolInfo: poolData = await this.sortResponceData(resPoolInfo, mapping);
      mapping.stakingToken.totalSupply = toDecimals(poolInfo.supply, poolInfo.decimals);
      const farmShare = toBN(mapping.extra.quarryInfo.totalTokensDeposited).div(
        toBN(poolInfo.supply),
      );

      mapping.stakingToken.tokens.forEach((t) => {
        const token: tokenInfo = poolInfo.tokens.find((ts) => ts.mint === t.address);
        t.reserve = toDecimals(token.amount, t.decimals);
        t.balance = Number(farmShare.multipliedBy(toBN(t.reserve)));
      });

      mapping.stakingToken.tokens = tokensWithPrices(
        mapping.stakingToken.tokens as { address; reserve; price; positionInPool }[],
        prices,
      ).map((t) => {
        t.value = t.balance * t.price;
        mapping.stats.tvl += t.value;
        return t;
      });

      this.mapping[index] = mapping;
    }
    return this.mapping;
  }

  private async getPoolsInfo(pools: IntegrationStakingPositionDto[]) {
    const config = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'jsonParsed',
    };

    const limitData = 33;

    const chunksLp = toChunkedArray(pools, limitData);

    let responceListData = [];
    for (const chunk of chunksLp) {
      const rcpDataPools: rpcDataPools[] = [];
      let idNum = 0;
      for (const value of chunk) {
        rcpDataPools.push({
          jsonrpc: config.jsonrpc,
          id: idNum++,
          method: config.method,
          params: [value.extra.pool.swap.state.poolTokenMint, { encoding: config.encoding }],
        });

        const tokensReserve = {
          tokenA: value.extra.pool.swap.state.tokenA.reserve,
          tokenB: value.extra.pool.swap.state.tokenB?.reserve,
        };

        for (const key in tokensReserve) {
          if (!tokensReserve[key]) {
            continue;
          }
          rcpDataPools.push({
            jsonrpc: config.jsonrpc,
            id: idNum++,
            method: config.method,
            params: [tokensReserve[key], { encoding: config.encoding }],
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

  private sortResponceData(data: any[], lpf: IntegrationStakingPositionDto): poolData {
    const tokens = [];
    let pool: poolData;
    for (const value of data) {
      const parsedInfo = value.result.value.data.parsed.info;
      if (
        parsedInfo.mintAuthority &&
        parsedInfo.mintAuthority === lpf.extra.pool.swap.config.authority
      ) {
        pool = {
          decimals: parsedInfo.decimals,
          mintAuthority: parsedInfo.mintAuthority,
          supply: parsedInfo.supply,
          tokens: [],
        };
      } else if (parsedInfo.owner && parsedInfo.owner === lpf.extra.pool.swap.config.authority) {
        tokens.push({
          mint: parsedInfo.mint,
          owner: parsedInfo.owner,
          decimals: parsedInfo.tokenAmount.decimals,
          amount: parsedInfo.tokenAmount.amount,
        });
      }
    }
    pool['tokens'] = tokens;
    return pool;
  }
}
