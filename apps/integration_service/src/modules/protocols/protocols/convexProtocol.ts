import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { ClassConstructor, plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  Logger,
  ChainAbbrEnum,
  ProjectEnum,
  FeatureEnum,
  ConvexProtocolEnum,
  ProtocolTypeEnum,
  ProtocolNameEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { CallData } from '@app/common/dto/CallData';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  UnderlyingStakingLp,
} from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import BasicProtocol from './basicProtocol';
import { BOOSTER_ADDRESS } from './convex/constants';
import { BaseRewardPool } from './convex/contracts/BaseRewardPool';
import { Booster } from './convex/contracts/Booster';
import { BaseDataResponse, PoolInfo } from './convex/interfaces';

@Injectable()
export class ConvexProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.convex;
  readonly name = ConvexProtocolEnum.Convex;
  readonly displayName = 'Convex';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const errors: string[] = [];
    const baseData: BaseData[] = [];
    try {
      const { errors: curveErrors, data: curveBaseData } = await this.getBoosterPools(
        addresses,
        chain,
      );

      errors.push(...curveErrors);
      baseData.push(...curveBaseData);
      return [baseData, errors];
    } catch (e) {
      console.log(e);
      return [[], [e]];
    }
  }

  async getBoosterPools(addresses: Address[], chain: ChainDto): Promise<BaseDataResponse> {
    const poolInfo = await this.getPoolInfo(chain);

    const calls = new Map<string, CallData>();
    addresses.forEach((address) => {
      poolInfo.forEach((pool) => {
        const [poolId] = pool.input.data;
        const crvRewardPool = new BaseRewardPool(pool.output.data.crvRewards);
        calls.set(
          `${address}_${poolId}_${pool.output.data.crvRewards}`,
          crvRewardPool.balanceOf(address),
        );
      });
    });

    const resultsRaw = await this.multicall.handleInBatches<BigNumber>(calls, chain);
    const userData = new Map<Address, any[]>(); // address => { poolId: balance }
    const assetsAddresses = new Set<string>();

    resultsRaw.forEach((value, key) => {
      const [address, poolId] = key.split('_');
      if (!value.output.data.gt(0)) {
        return;
      }

      if (!userData.has(address)) {
        userData.set(address, []);
      }

      const pool = poolInfo.get(`poolInfo(${poolId})`).output.data;

      // Get unique list of assets
      assetsAddresses.add(pool.lptoken); // save the deposited asset

      // Group the required data
      userData.get(address).push({
        pool,
        poolId: Number(poolId),
        balance: value.output.data.toString(),
      });

      //   console.log(position);
      //   userData.get(address).push(position);
    });

    const assets = await this.getAssets(Array.from(assetsAddresses), chain);
    const baseData: BaseData[] = [];
    addresses.forEach((address) => {
      const data = userData.get(address);
      const items = data.map((item) => {
        return this.getStakingPositionDto(
          item.pool,
          item.poolId,
          item.balance,
          chain,
          assets.get(item.pool.lptoken.toLowerCase()),
        );
      });
      baseData.push(
        this.formatBaseData(address, chain, FeatureEnum.staking, BaseDataStaking, items),
      );
    });

    return { errors: [], data: baseData };
  }

  async getPoolInfo(chain: ChainDto) {
    const booster = new Booster(chain);
    const poolLength = await this.multicall.call(booster.poolLength(), chain);

    const poolIds = Array.from(Array(parseInt(poolLength.toString(), 10)).keys());
    const calls = new Map<string, CallData>();
    poolIds.forEach((poolId) => {
      calls.set(`poolInfo(${poolId})`, booster.poolInfo(poolId));
    });

    return await this.multicall.handleInBatches<PoolInfo>(calls, chain.id);
  }

  async getAssets(addresses: Address[], chain: ChainDto): Promise<Map<Address, Asset>> {
    const { data } = await this.accountService.getAssets(addresses, [chain.id]);
    return data.reduce((map, asset) => map.set(asset.address, asset), new Map());
  }
  //   unused
  toLabel(...args) {
    return args.join('_');
  }

  fromLabel(args) {
    return args.split('_');
  }

  /**
   * Format BaseData Types
   */

  getStakingPositionDto(
    pool: PoolInfo,
    poolId: number,
    balance: BigNumber,
    chain: ChainDto,
    asset: Asset,
  ): IntegrationStakingPositionDto {
    return plainToClass(IntegrationStakingPositionDto, {
      address: BOOSTER_ADDRESS[chain.id],
      poolId: poolId,
      poolName: asset.name,
      staked: pool.lptoken,
      // stats: Stats = plainToClass(Stats, {});
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        // ERC20
        address: asset.address,
        name: asset.name,
        symbol: asset.symbol,
        decimals: asset.decimals,

        // Extras
        balance: normalizeDecimals(balance.toString(), asset.decimals),
        tokens: asset.underlyingAssets?.map((underlying) => underlying),
        // tokens: Array<IntegrationPoolTokenDto | UnderlyingStakingLp> = [];
      }),
      rewards: [],
      // rewards: IntegrationClaimableTokenDto[] = [plainToClass(IntegrationClaimableTokenDto, {})];
      // // data not included to feature but need to have to get realtime data
      // extra?: any = {};
    });
  }

  formatBaseData<T, K>(
    address: Address,
    chain: ChainDto,
    feature: FeatureEnum,
    type: ClassConstructor<T>,
    items: K[],
  ): T {
    return plainToClass(type, {
      chain,
      projectName: ProjectEnum.convex,
      protocolName: ProtocolNameEnum.Convex,
      userAddress: address,
      protocolType: ProtocolTypeEnum.staking,
      feature,
      items,
    });
  }
}
