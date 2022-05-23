import { Farm, FarmPoolKeys, Liquidity } from '@raydium-io/raydium-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { classToPlain, plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { RaydiumFarmVersion, RaydiymFarm } from '@app/common/jobs/raydiym.farm';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings, objToString } from '@app/common/utils';
import { toBN } from '@app/common/utils/number';
import {
  solanaKeysToStrings,
  solanaStringsToKeys,
  tokensWithPrices,
} from '@app/common/utils/solana';
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
import { decodeTxLogs, getInfoPools } from './raydium.poolsInfo';

const HALF = 0.5;
const POSITION_0 = 0;
const POSITION_1 = 1;
const LP_DEFAULT_NAME = 'Raydium LP Token';
const LP_DEFAULT_DECIMALS = 9;

@Injectable()
export class RaydiumStaking implements JobInterface {
  chain = ChainIdEnum.sol;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.raydium;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping: IntegrationStakingPositionDto[] = [];
  private availableDtosForConversion: Map<string, string>;
  private web3: Connection;
  private farmsUrl = 'https://sdk.raydium.io/farm/mainnet.json';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly priceService: PriceService,
    private readonly webProvider: Web3SolanaProviderService,
    private readonly httpService: HttpService,
  ) {
    this.web3 = webProvider.getInstanceByChainId(this.chain);
    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
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
    const farmsListData = await this.httpService
      .get(this.farmsUrl)
      .pipe(map((r) => r.data))
      .toPromise();
    let farms = farmsListData.official;

    //farms = farms.filter((f) => f.programId === RaydiymFarm.version3.programId);
    farms = farms.map(solanaStringsToKeys);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lpPools = await Liquidity.getPools(this.web3);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];
    for (const farm of farms) {
      try {
        // for single token
        if (RaydiymFarm.version3SingleTokens.includes(farm.id.toBase58())) {
          stakingFeatures.push(await this.getFarmForSingleToken(farm));
          continue;
        }

        // not working without toBase58()
        const associatedPool = lpPools.find(
          (lp) => lp.lpMint.toBase58() === farm.lpMint.toBase58(),
        );
        if (!associatedPool) {
          this.logger.error(`not found liquidity pool for farm pool id ${farm.id.toBase58()}`);
          continue;
        }

        const [token0, token1] = await Promise.all([
          this.accountService.saveTrackingAsset(associatedPool.baseMint.toBase58(), this.chain),
          this.accountService.saveTrackingAsset(associatedPool.quoteMint.toBase58(), this.chain),
        ]);
        const rewardTokens: LiquidityPoolTokenDto[] = await Promise.all(
          farm.rewardMints.map((mint) => {
            return this.accountService.saveTrackingAsset(mint.toBase58(), this.chain);
          }),
        );
        const lpToken = await this.accountService.saveAsset({
          address: associatedPool.lpMint.toBase58(),
          name: LP_DEFAULT_NAME + ' ' + (token0.symbol + '-' + token1.symbol),
          symbol: token0.symbol + '/' + token1.symbol,
          decimals: LP_DEFAULT_DECIMALS,
          isLp: true,
          chain: this.chain,
        });
        const stakingFeature = plainToClass(IntegrationStakingPositionDto, {
          address: farm.id.toBase58(),
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
                positionInPool: POSITION_0,
                weight: HALF,
              }),
              plainToClass(IntegrationPoolTokenDto, {
                address: token1.address,
                name: token1.name,
                symbol: token1.symbol,
                decimals: token1.decimals,
                positionInPool: POSITION_1,
                weight: HALF,
              }),
            ],
          }),
          rewards: rewardTokens.map((rt) =>
            plainToClass(IntegrationClaimableTokenDto, {
              address: rt.address,
              name: rt.name,
              symbol: rt.symbol,
              decimals: rt.decimals,
            }),
          ),
          extra: {
            farm: solanaKeysToStrings(farm),
            pool: solanaKeysToStrings(associatedPool),
          },
        });
        stakingFeatures.push(stakingFeature);
      } catch (e) {
        this.logger.error(
          `error to build initial mapping for farm [${farm.id.toBase58()}], chain [${this.chain}]`,
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

  private async getFarmForSingleToken(farm): Promise<IntegrationStakingPositionDto> {
    const rewardTokens: LiquidityPoolTokenDto[] = await Promise.all(
      farm.rewardMints.map((mint) => {
        return this.accountService.saveTrackingAsset(mint.toBase58(), this.chain);
      }),
    );
    const stakingToken = await this.accountService.saveTrackingAsset(
      farm.lpMint.toBase58(),
      this.chain,
    );
    return plainToClass(IntegrationStakingPositionDto, {
      address: farm.id.toBase58(),
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: stakingToken.address,
        name: stakingToken.name,
        symbol: stakingToken.symbol,
        decimals: stakingToken.decimals,
      }),
      rewards: rewardTokens.map((rt) =>
        plainToClass(IntegrationClaimableTokenDto, {
          address: rt.address,
          name: rt.name,
          symbol: rt.symbol,
          decimals: rt.decimals,
        }),
      ),
      extra: {
        farm: solanaKeysToStrings(farm),
      },
    });
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
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async updateWithChainData(): Promise<any[]> {
    this.mapping = this.mapping.filter((x) => x.extra.farm.id);
    this.mapping = await this.adjustFarmInfo(this.mapping);

    const tokenAddressesSet = new Set<string>();
    this.mapping.forEach((m) => {
      if (m.stakingToken.tokens.length > 0) {
        m.stakingToken.tokens.forEach((t) => tokenAddressesSet.add(t.address));
      } else {
        tokenAddressesSet.add(m.stakingToken.address);
      }
    });

    const pricedTokenAddresses: string = Array.from(tokenAddressesSet).join(',');
    const farmsKeys: FarmPoolKeys[] = this.mapping.map(
      (m) => solanaStringsToKeys(m.extra.farm) as FarmPoolKeys,
    );

    const [{ prices }, farmsInfos] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        this.chain,
        this.protocol,
      ),
      Farm.getMultipleInfo({
        connection: this.web3,
        pools: farmsKeys,
      }),
    ]);

    const infoPools = await getInfoPools(
      this.web3,
      this.httpService,
      this.mapping.filter((m) => m.extra.pool).map((m) => m.extra.pool),
    );
    const decodedInfoPools = infoPools.map((p) => decodeTxLogs(p.result.value.logs));
    const decodedInfoPoolsMap = new Map(decodedInfoPools.map((dip) => [dip.ammId, dip]));

    for (const index in this.mapping) {
      const mapping: IntegrationStakingPositionDto = this.mapping[index];
      const farmInfo = farmsInfos[index];
      if (mapping.extra.pool) {
        const poolInfo = decodedInfoPoolsMap.get(mapping.extra.pool.id);
        if (poolInfo) {
          mapping.staked = farmInfo.lpVault.amount.toString();
          if (RaydiymFarm.version3SingleTokens.includes(mapping.extra.farm.id)) {
            mapping.stakingToken.price = Number(prices[mapping.stakingToken.address]);
            mapping.stakingToken.value =
              mapping.stakingToken.price *
              toDecimals(mapping.staked, mapping.stakingToken.decimals);
            mapping.stats.tvl = mapping.stakingToken.value;
          } else {
            const farmShare = toBN(farmInfo.lpVault.amount).div(toBN(poolInfo.lpSupply));
            mapping.stakingToken.totalSupply = toDecimals(poolInfo.lpSupply, poolInfo.lpDecimals);
            mapping.stakingToken.tokens.forEach((t) => {
              t.reserve =
                t.positionInPool === 0
                  ? toDecimals(poolInfo.baseReserve, t.decimals)
                  : toDecimals(poolInfo.quoteReserve, t.decimals);
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
          }
        }
      }

      this.mapping[index] = mapping;
    }
    return this.mapping;
  }

  private async adjustFarmInfo(mapping: IntegrationStakingPositionDto[]) {
    const publicKeys = mapping.map((x) => new PublicKey(x.extra.farm.id));
    const rpcInfo = await this.web3.getMultipleAccountsInfo(publicKeys);

    for (let i = 0; i < mapping.length; i++) {
      let layout;
      switch (mapping[i].extra.farm.version) {
        case RaydiumFarmVersion.version3:
          layout = RaydiymFarm.version3.stakeInfoLayout;
          break;
        case RaydiumFarmVersion.version5:
          layout = RaydiymFarm.version5.stakeInfoLayout;
          break;
      }
      if (layout) {
        const decodedData = layout.decode(rpcInfo[i].data);
        mapping[i].extra.farmInfo = objToString(decodedData);
      }
    }
    return mapping;
  }
}
