import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  ChainIdEnum,
  ClaimableDto,
  ICallData,
  Logger,
  ProtocolNameEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { BadgerProtocolEnum, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { Abis } from './abis';
import addressesArbi from './addresses/addresses.arbi';
import addressesEth from './addresses/addresses.eth';
import addressesPlg from './addresses/addresses.plg';

@Injectable()
export class BadgerStaking {
  private addressesMaps = {};

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.addressesMaps[ChainIdEnum.eth] = this.createVaultsMap(addressesEth);
    this.addressesMaps[ChainIdEnum.arbi] = this.createVaultsMap(addressesArbi);
    this.addressesMaps[ChainIdEnum.plg] = this.createVaultsMap(addressesPlg);
  }

  private createVaultsMap(addresses) {
    const addressesMap = new Map<string, any>();
    addresses.stakingKeys.forEach((k) => {
      const settVault = addresses.settVaults[k]?.toLowerCase();
      addressesMap.set(settVault, {
        key: k,
        vault: settVault,
        strategy: addresses.settStrategies[k]?.toLowerCase(),
        pool: addresses.crvPools[k]?.toLowerCase(),
      });
    });
    return addressesMap;
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${BadgerProtocolEnum.badger}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const addressesMap = this.addressesMaps[chain.id];

    const multicall: MulticallService = this.multicallProvider.getForChain(chain.abbr);

    addresses = addresses.map((a) => a.toLowerCase());

    const base: BaseDataStaking[] = [];

    const multicallData = await this.getDataWithMulticall(
      addresses,
      multicall,
      pools,
      addressesMap,
      chain,
    );

    addresses.forEach((a) => {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.autofarm,
        protocolName: ProtocolNameEnum.autofarm,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      const userStakingPositions: IntegrationStakingPositionDto[] =
        this.getStakingPositionsForAddress(userMulticallData, pools);

      baseInfo.items.push(...userStakingPositions);
      base.push(baseInfo);
    });

    return base;
  }

  private async getDataWithMulticall(
    addresses: Address[],
    multicall,
    pools,
    addressesMap,
    chain: ChainDto,
  ) {
    const balances = await this.getBalances(addresses, pools, multicall);

    const rewardBalances: Map<string, ICallData> =
      chain.id === ChainIdEnum.arbi
        ? new Map<string, ICallData>()
        : await this.getRewards(balances, addressesMap, multicall);

    const claimableRewards: {
      vault: string;
      balance: BigNumber;
      userAddress: string;
    }[] = [];

    rewardBalances.forEach((rewardBalance, rewardBalanceLabel) => {
      const id = rewardBalanceLabel.split('_');
      claimableRewards.push({
        vault: id[1].toLowerCase(),
        balance: rewardBalance.output.data,
        userAddress: id[0],
      });
    });

    return { balances, claimableRewards };
  }

  private async getBalances(addresses, pools, multicall) {
    let calls = new Map<string, ICallData>();

    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        calls.set(this.balanceOfLabel(address, pool.address), {
          address: pool.address,
          abi: Abis.balanceOf,
          input: {
            data: [address],
          },
          output: {},
        });
      });
    });

    const balances = [];
    const userInfos: Map<string, ICallData> = await multicall.handleInBatches(calls);

    userInfos.forEach((userInfo, userInfoLabel) => {
      if (Number(userInfo.output.data) > 0) {
        const data = userInfoLabel.split('_');
        balances.push({
          vault: data[1],
          userAddress: data[0],
          balance: userInfo.output.data,
        });
      }
    });

    return balances;
  }

  private async getRewards(balances, addressesMap, multicall): Promise<Map<string, ICallData>> {
    const rewardPoolCalls = new Map<string, ICallData>();

    balances.forEach((b) => {
      const vaultData = addressesMap.get(b.vault.toLowerCase());

      if (vaultData.pool) {
        rewardPoolCalls.set(this.simpleLabel(b.userAddress, vaultData.vault), {
          address: vaultData.strategy,
          abi: Abis.baseRewardsPool,
          input: {
            data: [],
          },
          output: {},
        });
      }
    });

    const rewardsPoolAddresses: Map<string, ICallData> = await multicall.handleInBatches(
      rewardPoolCalls,
    );

    const rewardBalanceCalls = new Map<string, ICallData>();

    rewardsPoolAddresses.forEach((callData, callDataLabel) => {
      rewardBalanceCalls.set(callDataLabel, {
        address: callData.output.data,
        abi: Abis.earned,
        input: {
          data: [callDataLabel.split('_')[0]],
        },
        output: {},
      });
    });

    const rewardBalances: Map<string, ICallData> = await multicall.handleInBatches(
      rewardBalanceCalls,
    );

    return rewardBalances;
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.balances.filter((b) => b.userAddress === userAddress);
    const claimableRewards = multicallData.claimableRewards.filter(
      (r) => r.userAddress === userAddress,
    );

    return { balances, claimableRewards };
  }

  private getStakingPositionsForAddress({ balances, claimableRewards }, pools: NotifyStaking) {
    const stakingPositions: IntegrationStakingPositionDto[] = [];
    const poolsMap = new Map<string, IntegrationStakingPositionDto>();
    pools.items.forEach((p) => {
      poolsMap.set(p.address.toLowerCase(), p);
    });

    balances.forEach((b) => {
      const balanceVaultAddress = b.vault.toLowerCase();
      const stakingPosition: IntegrationStakingPositionDto = poolsMap.get(balanceVaultAddress);

      const stakedBigNumber = new BigNumber(b.balance).div(
        decimalsDivider(stakingPosition.stakingToken.decimals),
      );
      stakingPosition.stakingToken.balance = stakedBigNumber.toNumber();

      if (stakingPosition.stakingToken.tokens) {
        const poolShare = stakedBigNumber.div(
          new BigNumber(stakingPosition.stakingToken.totalSupply),
        );
        stakingPosition.stakingToken.tokens.forEach((clpt) => {
          clpt.balance = poolShare.times(new BigNumber(clpt.reserve)).toNumber();
        });
      }

      if (stakingPosition.stakingToken.tokens.length === 0) {
        stakingPosition.stakingToken.value = Number(
          stakedBigNumber.times(new BigNumber(stakingPosition.stakingToken.price)),
        );
      }

      stakingPosition.staked = b.balance;

      // find and set claimable rewards:
      const claimableReward = claimableRewards.find(
        (cr) => cr.userAddress === b.userAddress && cr.vault === balanceVaultAddress,
      );

      if (claimableReward) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = claimableReward.balance
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }

  private balanceOfLabel(userAddress: string, vault: string) {
    return concatStrings(userAddress, vault);
  }

  private simpleLabel(...addresses: string[]) {
    return concatStrings(...addresses);
  }
}
