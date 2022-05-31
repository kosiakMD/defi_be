import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/erc20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { BaseData } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';
import BasicProtocol from './basic-protocol';

export class BeefyProtocol extends BasicProtocol {
  readonly chains = [
    ChainAbbrEnum.arbi,
    ChainAbbrEnum.avax,
    ChainAbbrEnum.bnb,
    ChainAbbrEnum.celo,
    ChainAbbrEnum.cro,
    ChainAbbrEnum.ftm,
    ChainAbbrEnum.harm,
    ChainAbbrEnum.mriver,
    ChainAbbrEnum.plg,
  ];
  readonly project = ProjectEnum.beefy;
  readonly name = ProtocolNameEnum.Beefy;
  readonly displayName = 'Beefy Finance';
  readonly features = {
    [ChainAbbrEnum.arbi]: [FeatureEnum.staking],
    [ChainAbbrEnum.avax]: [FeatureEnum.staking],
    [ChainAbbrEnum.bnb]: [FeatureEnum.staking],
    [ChainAbbrEnum.celo]: [FeatureEnum.staking],
    [ChainAbbrEnum.cro]: [FeatureEnum.staking],
    [ChainAbbrEnum.ftm]: [FeatureEnum.staking],
    [ChainAbbrEnum.harm]: [FeatureEnum.staking],
    [ChainAbbrEnum.mriver]: [FeatureEnum.staking],
    [ChainAbbrEnum.plg]: [FeatureEnum.staking],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly accountService: AccountService,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const errors: string[] = [];
    const baseData: BaseData[] = [];

    const pools = await this.getCache(chain);

    const { errors: _errors, data: _data } = await this.getStakingPositions(
      addresses,
      chain,
      pools,
    );

    errors.push(..._errors);
    baseData.push(..._data);
    return [baseData, errors];
  }

  private async getStakingPositions(
    addresses: Address[],
    chain: ChainDto,
    pools: NotifyStaking,
  ): Promise<{ errors: string[]; data: BaseData[] }> {
    const errors: string[] = [];
    const data: BaseData[] = [];
    const calls = new Map();
    pools.items.map((pool) => {
      const contract = new ERC20(pool.address);
      addresses.forEach((address) => {
        calls.set(`${address}-${pool.address}`, contract.balanceOf(address));
      });
    });

    const balances = await this.multicall.handleInBatches(calls, chain.id);
    addresses.forEach((address) => {
      const items: IntegrationStakingPositionDto[] = [];
      pools.items.forEach((pool) => {
        const balanceRaw = balances.get(`${address}-${pool.address}`).output.data.toString();
        const balance = normalizeDecimals(balanceRaw, pool.stakingToken.decimals);
        if (!balance) return;

        const position = plainToClass(IntegrationStakingPositionDto, pool);
        position.staked = balanceRaw;
        position.stakingToken.balance = balance * pool.extra.pricePerShare;
        position.stakingToken.value = position.stakingToken.price * position.stakingToken.balance;
        const share = position.stakingToken.value / position.stats.tvl;

        position.stakingToken.tokens.forEach((token) => {
          token.balance = token.balance * share;
          token.value = token.balance * token.price;
        });

        items.push(position);
      });

      if (items.length) {
        data.push(
          plainToClass(BaseDataStaking, {
            chain,
            userAddress: address,
            protocolType: ProtocolTypeEnum.staking,
            projectName: ProjectEnum.beefy,
            protocolName: this.name,
            feature: FeatureEnum.staking,
            items,
          }),
        );
      }
    });

    return { errors, data };
  }

  private async getCache(chain: ChainDto): Promise<NotifyStaking> {
    const cacheKey = `${chain.id}_${this.name}_${FeatureEnum.staking}`;
    return this.cache.get(cacheKey);
  }
}
