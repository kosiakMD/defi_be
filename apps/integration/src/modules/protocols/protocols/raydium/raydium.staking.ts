import { Connection, GetProgramAccountsConfig, PublicKey } from '@solana/web3.js';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { chunk, cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { Address, ChainDto, FeatureEnum, ProtocolTypeEnum, RaydiumProtocolEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { RaydiumFarm } from '@app/common/jobs/raydium.farm';
import {
  FARM_FILTERS_V3,
  FARM_FILTERS_V3_1,
  FARM_FILTERS_V4,
  FARM_FILTERS_V5,
} from '@app/common/jobs/raydium.farm-filters';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { decimalsDivider, keepSolAddresses, normalizeDecimals } from '@app/common/utils';

import { Web3Provider } from '../../../chains/web3.provider';
import { PriceService } from '../../../microservices/price.service';

@Injectable()
export class RaydiumStaking {
  private web3: Connection;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly priceService: PriceService,
    private readonly web3Provider: Web3Provider,
  ) {
    this.web3 = this.web3Provider.instanceSol();
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    addresses = keepSolAddresses(addresses);
    if (addresses.length === 0) return [];

    const cacheKey = `${chain.id}_${RaydiumProtocolEnum.raydium}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const cachedPoolsMap = new Map<string, IntegrationStakingPositionDto>(
      cachedPools.items.map((cpi) => [cpi.address.toString(), cpi]),
    );

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: RaydiumProtocolEnum.raydium,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );
    const assets = cachedPools.items.map((cpi) => {
      return [
        ...cpi.stakingToken.tokens.map((t) => t.address),
        ...cpi.rewards.map((t) => t.address),
      ];
    });

    const assetSet = new Set(assets.flat());
    const { prices } = await this.priceService.getTokenPrices([...assetSet], chain.id);

    const balances = await this.getBalances(addresses);

    for (const b of balances) {
      const vault = cachedPoolsMap.get(b.poolId.toString());

      if (!vault || (new BN(b.depositBalance).isZero() && new BN(b.rewardDebt).isZero())) continue;

      const stakingPosition: IntegrationStakingPositionDto = cloneDeep(vault);
      const balance = new BN(b.depositBalance).div(decimalsDivider(vault.stakingToken.decimals));
      const userShare = balance.div(new BN(vault.stakingToken.totalSupply));
      stakingPosition.staked = b.depositBalance.toString();
      stakingPosition.stakingToken.balance = balance.toNumber();

      stakingPosition.stakingToken.tokens.forEach((t) => {
        const tokenPrice = t.price ?? prices[t.address] ?? 0;
        t.balance = userShare.toNumber() * t.reserve;
        t.value = tokenPrice * t.balance;
      });

      stakingPosition.rewards.forEach((reward, index) => {
        const pendingRewards = this.pendingRewards(stakingPosition, b, index);
        const balance = normalizeDecimals(pendingRewards, reward.decimals);
        const tokenPrice = reward.price ?? prices[reward.address] ?? 0;

        reward.claimableData.balance = balance;
        reward.claimableData.value = balance * tokenPrice;
        return reward;
      });

      stakingPosition.extra = undefined;
      baseDataStakingMap.get(b.stakerOwner.toString()).items.push(stakingPosition);
    }

    return Array.from(baseDataStakingMap.values());
  }

  // TODO: this approach works a bit slow for more then 2 addresses
  // TODO: need to cache all account balances in cache and get balance from it
  private async getBalances(addresses: Address[]): Promise<StakeBalance[]> {
    const programs = [
      RaydiumFarm.version3.programId,
      RaydiumFarm.version4.programId,
      RaydiumFarm.version5.programId,
      RaydiumFarm.version3.programId,
    ];

    const filters = [FARM_FILTERS_V3, FARM_FILTERS_V4, FARM_FILTERS_V5, FARM_FILTERS_V3_1];
    const layouts = [
      RaydiumFarm.version3.userInfoLayout,
      RaydiumFarm.version4.userInfoLayout,
      RaydiumFarm.version5.userInfoLayout,
      RaydiumFarm.version31.userInfoLayout,
    ];

    const requests = addresses.flatMap((address) => {
      return programs.map((programId, index) => {
        const filter: GetProgramAccountsConfig = {
          commitment: 'confirmed',
          encoding: 'base64',
          filters: filters[index](address),
        };
        return this.web3.getProgramAccounts(new PublicKey(programId), filter);
      });
    });

    const rpcResponse = await Promise.all(requests);
    const chunked = chunk(rpcResponse, programs.length);

    const balances = [];

    for (let i = 0; i < chunked.length; i++) {
      const userPosition = chunked[i];
      for (let j = 0; j < userPosition.length; j++) {
        const userDataByProgram = userPosition[j];
        let layout = layouts[j];
        if (userDataByProgram.length > 0) {
          for (const data of userDataByProgram) {
            if (j === 2 && data.account.data.length === RaydiumFarm.version4.userInfoLayout.span) {
              layout = RaydiumFarm.version4.userInfoLayout;
            }

            const decoded = layout.decode(data.account.data);
            const version = RaydiumFarm.version3.programId === programs[j] ? 3 : 5;
            balances.push({
              ...decoded,
              version,
            });
          }
        }
      }
    }

    return balances;
  }

  private pendingRewards(
    staking: IntegrationStakingPositionDto,
    balance: StakeBalance,
    position: number,
  ): string {
    const decimalsDivider = balance.version === 5 ? 1e15 : 1e9;
    let rewardPerSecond = '0';
    const rewardDebt = position === 0 ? balance.rewardDebt : balance.rewardDebtB;
    if (position === 0) {
      rewardPerSecond = staking.extra.farmInfo.rewardPerShareNet || staking.extra.farmInfo.perShare;
    } else {
      rewardPerSecond = staking.extra.farmInfo.perShareB;
    }

    const pendingReward = new BN(balance.depositBalance) //
      .times(rewardPerSecond)
      .div(decimalsDivider)
      .minus(rewardDebt);

    return pendingReward.toString();
  }
}

interface StakeBalance {
  version: number;
  state: BN;
  poolId: PublicKey;
  programId: string;
  stakerOwner: PublicKey;
  depositBalance: BN;
  rewardDebt: BN;
  rewardDebtB: BN;
}
