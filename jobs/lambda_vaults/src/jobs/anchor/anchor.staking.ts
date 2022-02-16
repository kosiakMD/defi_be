// eslint-disable-next-line max-classes-per-file
import { AddressProviderFromJson, columbus5 } from '@anchor-protocol/anchor.js';
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
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
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
import { AnchorAddresses } from './addresses';
import { AnchorApi } from './anchor.api';

@Injectable()
export class AnchorStaking implements JobInterface {
  chain = ChainIdEnum.terra;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.anchor;
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

  /** completed for masterchief contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];
    const addressProvider = new AddressProviderFromJson(columbus5);
    const [ancToken, baseToken] = await Promise.all([
      this.accountService.saveTrackingAsset(addressProvider.ANC(), this.chain),
      this.accountService.saveTrackingAsset(AnchorAddresses.baseRewardToken, this.chain),
    ]);

    const ancRewardToken = this.getClaimableTokenDto(ancToken);
    const baseRewardToken = this.getClaimableTokenDto(baseToken);

    for (const address of [addressProvider.ancUstLPToken(), addressProvider.ANC()]) {
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

        const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
          IntegrationStakingPositionDto,
          {
            address: stakingToken.tokens.length ? addressProvider.staking() : addressProvider.gov(),
            poolId: null,
            poolName: null,
            rewards: stakingToken.tokens.length
              ? [ancRewardToken, baseRewardToken]
              : [ancRewardToken],
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
        mappedDto.rewards.push({ dbId: rewardTokenItem.id, dtoName: reward.constructor.name });
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

  async updateWithChainData(): Promise<NotifySupportedFeature[]> {
    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, this.chain),
    ]);

    const terra: LCDClient = this.web3ProviderService.getInstanceByChainId(this.chain);
    const addressProvider = new AddressProviderFromJson(columbus5);
    const ancApi = new AnchorApi(this.logger);
    this.mapping = await Promise.all(
      this.mapping.map(async (m) => {
        const { balance } = await terra.wasm.contractQuery(m.stakingToken.address, {
          balance: { address: m.address },
        });

        m.stakingToken.balance = m.staked = toDecimals(balance, m.stakingToken.decimals);
        if (m.stakingToken.tokens?.length) {
          const poolInfo: PoolAssetsQueryResp = await terra.wasm.contractQuery(
            addressProvider.ancUstPair(),
            {
              pool: {},
            },
          );
          const ancApy = await ancApi.getAncUstLpRewardApy();
          m.stakingToken.totalSupply = toDecimals(poolInfo.total_share, m.stakingToken.decimals);
          m.stakingToken.tokens.map((token) => {
            const assetInfo = poolInfo.assets.find(
              (asset) =>
                asset.info.token?.contract_addr === token.address ||
                asset.info.native_token?.denom === token.address,
            );
            token.reserve = token.balance = toDecimals(assetInfo.amount, token.decimals);
            token.price = Number(prices[token.address]);
            token.value = token.balance * token.price;
            m.stats.tvl += token.value;
            return token;
          });

          m.rewards.forEach((reward) => (reward.price = Number(prices[reward.address])));

          // TODO: find how calculate astroport lp token APR
          // const { creator } = await terra.wasm.contractInfo(addressProvider.ancUstPair());
          // const { generator_address } = await terra.wasm.contractQuery(creator, { "config": {} });
          // const generatorPoolInfo: PoolInfoQueryResp = await terra.wasm.contractQuery(generator_address, { "pool_info": { "lp_token": m.stakingToken.address } });
          // const { total_alloc_point, tokens_per_block } = await terra.wasm.contractQuery(generator_address, { "config": {} });
          //
          // const aprStats = {
          //   totalAllocPoints: total_alloc_point,
          //   poolAllocPoints: generatorPoolInfo.alloc_point,
          //   rewardTokenPerBlock: toDecimals(tokens_per_block, m.rewards[0].decimals),
          //   rewardTokenPrice: m.rewards[0].price,
          //   blockTime: 6,6,
          //   farmingPoolTVL: m.stats.tvl,
          // };

          const ancReward = m.rewards.find((reward) => reward.address === addressProvider.ANC());
          ancReward.apr = Number(ancApy) * 100;
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

  private getClaimableTokenDto(token: LiquidityPoolTokenDto) {
    return plainToClass(IntegrationClaimableTokenDto, {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
    });
  }
}
