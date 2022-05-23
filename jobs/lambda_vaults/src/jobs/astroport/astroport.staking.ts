// eslint-disable-next-line max-classes-per-file
import { LCDClient } from '@terra-money/terra.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainIdEnum,
  CurrencyIdEnum,
  FeatureEnum,
  PoolAssetsQueryResp,
  ProtocolNameEnum,
} from '@app/common';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { AstroportAddresses } from './addresses';
import { AstroportGraph } from './astroport.graph';

@Injectable()
export class AstroportStaking implements JobInterface {
  chain = ChainIdEnum.terra;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.astroport;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly priceService: PriceService,
    protected readonly web3ProviderService: Web3ProviderService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async getLpRewardsMap(astroportPools: string[]) {
    const lcdClient = this.web3ProviderService.getInstanceByChainId(this.chain);

    const lpRewardsMap = new Map();
    await Promise.all(
      astroportPools.map(async (pool) => {
        try {
          const rewardsObj = await lcdClient.wasm.contractQuery(AstroportAddresses.generator, {
            // eslint-disable-next-line camelcase
            reward_info: {
              // eslint-disable-next-line camelcase
              lp_token: pool,
            },
          });
          lpRewardsMap.set(pool, Object.values(rewardsObj));
        } catch (e) {
          //
        }
      }),
    );
    return lpRewardsMap;
  }

  /** completed for masterchief contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const graphData = await AstroportGraph.getPoolsInfo();
    const astroportPoolsV2 = [];
    graphData.pools?.forEach((pool) => {
      if (pool.lp_address) {
        astroportPoolsV2.push(pool.lp_address.toLowerCase());
      }
    });
    const lpRewardsMap: Map<string, string[]> = await this.getLpRewardsMap(astroportPoolsV2);
    const rewardsAddresses = new Set(
      Array.from(lpRewardsMap.values())
        .flat()
        .filter((reward) => reward),
    );
    const rewardsArray = Array.from(rewardsAddresses.values());

    const rewardsTokens = await Promise.all(
      rewardsArray.map(async (reward) => {
        return this.accountService.saveTrackingAsset(reward, this.chain);
      }),
    );

    const rewardTokensMap = new Map(
      rewardsTokens.map((token) => [
        token.address,
        plainToClass(IntegrationClaimableTokenDto, {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
        }),
      ]),
    );
    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    for (const address of Array.from(lpRewardsMap.keys())) {
      try {
        const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          address,
          this.chain,
        );

        const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
          address: poolTokenData.address,
          name: poolTokenData.name,
          symbol: poolTokenData.symbol,
          decimals: poolTokenData.decimals,
        });

        if (poolTokenData.underlyingAssets) {
          stakingToken.tokens = [];
          poolTokenData.underlyingAssets.forEach((pt) => {
            const poolToken: IntegrationPoolTokenDto = plainToClass(IntegrationPoolTokenDto, {
              address: pt.address,
              name: pt.name,
              symbol: pt.symbol,
              decimals: pt.decimals,
              positionInPool: pt.positionInPool,
            });
            stakingToken.tokens.push(poolToken);
          });
        }
        const rewardsAddresses = lpRewardsMap.get(stakingToken.address);
        const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
          IntegrationStakingPositionDto,
          {
            address: AstroportAddresses.generator,
            poolId: null,
            poolName: null,
            rewards: rewardsAddresses
              .filter((address) => address)
              .map((address) => rewardTokensMap.get(address)),
            stakingToken: stakingToken,
          },
        );

        stakingFeatures.push(stakingPoolFeature);
      } catch (e) {
        this.logger.error(
          `error to get token data from account service, chain [${this.chain}], address [${address}]`,
          this.placeholder,
        );
      }
    }

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.toDbMapping(stakingFeatures[i]));
    }

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async toDbMapping(stakingPosition: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    /** reward token */
    // todo: this unique ids must be moved to other place
    mappedDto.rewards = [];

    /** reward token */
    await Promise.all(
      stakingPosition.rewards.map(async (reward) => {
        const rewardTokenUniqueId = concatStrings(this.chain, reward.address);
        const rewardTokenItem: TrackedVaultItem = await this.getDbItem(reward, rewardTokenUniqueId);
        mappedDto.rewards.push({
          dbId: rewardTokenItem.id,
          dtoName: reward.constructor.name,
        });
      }),
    );

    /** staking token */
    const stakingTokenUniqueId = concatStrings(this.chain, stakingPosition.stakingToken.address);
    const stakingToken: TrackedVaultItem = await this.getDbItem(
      stakingPosition.stakingToken,
      stakingTokenUniqueId,
    );
    mappedDto.stakingToken = {
      dbId: stakingToken.id,
      dtoName: stakingPosition.stakingToken.constructor.name,
    };

    /** staking lp assets underlying */
    if (stakingPosition.stakingToken.tokens) {
      mappedDto.stakingToken.tokens = [];
      for (const t of stakingPosition.stakingToken.tokens) {
        const tokenId = concatStrings(this.chain, t.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
        mappedDto.stakingToken.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
        });
      }
    }

    /** position */
    const positionUniqueId = concatStrings(
      this.chain,
      stakingPosition.address,
      stakingPosition.poolId,
    );
    const position: TrackedVaultItem = await this.getDbItem(stakingPosition, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = stakingPosition.constructor.name;

    return mappedDto;
  }

  async getDbItem(item, uniqueId: string): Promise<TrackedVaultItem> {
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
        poolId: item.poolId,
        poolName: item.poolName,
      };
      newIntegrationJobItem.name = universalDto.poolName
        ? universalDto.poolName
        : universalDto.poolId;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);
    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async getLpTokensMinters(terra: LCDClient) {
    const mintersMap = new Map<string, string>();
    await Promise.all(
      this.mapping.map(async (staking) => {
        const { minter } = await terra.wasm.contractQuery(staking.stakingToken.address, {
          minter: {},
        });
        mintersMap.set(staking.stakingToken.address, minter);
      }),
    );
    return mintersMap;
  }

  async updateWithChainData(): Promise<IntegrationStakingPositionDto[]> {
    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');
    const terra: LCDClient = this.web3ProviderService.getInstanceByChainId(this.chain);
    const graphData = await AstroportGraph.getPoolsInfo();
    const graphDataMap = graphData?.pools.reduce((resp, pool) => {
      if (pool?.lp_address) {
        resp.set(pool.lp_address, pool);
      }
      return resp;
    }, new Map());

    const [{ prices }] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        this.chain,
        this.protocol,
      ),
    ]);

    this.mapping = await Promise.all(
      this.mapping.map(async (m) => {
        const graphPool = graphDataMap.get(m.stakingToken.address);
        const { balance } = await terra.wasm.contractQuery(m.stakingToken.address, {
          balance: { address: m.address },
        });

        m.stats.poolApy = (graphPool?.total_rewards.apr || 0) * 100;
        m.stakingToken.balance = m.staked = toDecimals(balance, m.stakingToken.decimals);
        if (m.stakingToken.tokens?.length) {
          const minter = graphDataMap.get(m.stakingToken.address).pool_address;
          const poolInfo: PoolAssetsQueryResp = await terra.wasm.contractQuery(minter, {
            pool: {},
          });
          m.stakingToken.totalSupply = toDecimals(poolInfo.total_share, m.stakingToken.decimals);
          m.stakingToken.tokens.map((token) => {
            const assetInfo = poolInfo.assets.find(
              (asset) =>
                asset.info.token?.contract_addr === token.address ||
                asset.info.native_token?.denom === token.address,
            );
            token.reserve = token.balance = toDecimals(assetInfo.amount, token.decimals);
            token.price =
              (token.address === graphPool.token1_address
                ? graphPool.token1_price_ust
                : graphPool.token2_price_ust) || Number(prices[token.address]);
            token.value = token.balance * token.price;
            return token;
          });
          m.stats.tvl = graphPool.pool_liquidity;

          m.rewards.forEach((reward) => {
            reward.apr =
              reward.address === AstroportAddresses.astro
                ? Number(graphPool?.astro_rewards.apr || 0) * 100
                : Number(graphPool?.protocol_rewards.apr || 0) * 100;
            reward.price = Number(prices[reward.address]);
          });
        } else {
          m.stakingToken.price = Number(prices[m.stakingToken.address]);
          m.stakingToken.value = m.stakingToken.balance * m.stakingToken.price;
          m.stats.tvl += m.stakingToken.value;
          m.rewards[0].price = Number(prices[m.rewards[0].address]);
        }
        return m;
      }),
    );

    return this.mapping;
  }

  private getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        if (m.stakingToken.tokens.length === 2) {
          m.stakingToken.tokens.forEach((t) => {
            addressesSet.add(t.address);
          });
        }
      } else {
        addressesSet.add(m.stakingToken.address);
      }
      m.rewards.forEach((reward) => addressesSet.add(reward.address));
    });
    return addressesSet;
  }
}
