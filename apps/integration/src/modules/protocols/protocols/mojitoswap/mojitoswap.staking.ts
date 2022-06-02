import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ClaimableDto, ICallData, Logger, ProtocolNameEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  FeatureEnum,
  MojitoswapProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { PriceService } from '../../../microservices/price.service';
import { AutostakingVaultAbis } from './contracts/autostaking.vault.abis';
import { MasterchefAbis } from './contracts/masterchef.abis';

@Injectable()
export class MojitoswapStaking {
  private readonly masterContract = '0x25c6d6a65c3ae5d41599ba2211629b24604fea4f';
  private readonly autoStakingVault = '0xf0d7c82e9f9be85b2d1f8bede40afe1c1fa7560c';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallService: MulticallAggregator,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${MojitoswapProtocolEnum.mojitoswap}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const multicallData = await this.getDataWithMulticall(addresses, pools, chain);

    const base: BaseDataStaking[] = addresses.map((a) => {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.mojitoswap,
        protocolName: ProtocolNameEnum.mojitoswap,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      const userStakingPositions: IntegrationStakingPositionDto[] =
        this.getStakingPositionsForAddress(userMulticallData, pools);

      baseInfo.items = userStakingPositions;
      return baseInfo;
    });

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], pools: NotifyStaking, chain: ChainDto) {
    const calls = new Map<string, ICallData>();

    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        if (pool.address !== this.autoStakingVault) {
          calls.set(this.contractCallLabel(address, pool.address, pool.poolId), {
            address: pool.address,
            abi: MasterchefAbis.userInfo,
            input: {
              data: [pool.poolId, address],
            },
            output: {},
          });
        }
      });
    });

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    const balances: {
      id: string;
      poolId: number;
      balance: string;
      contract: string;
      pendingMojito?: BigNumber;
      user: {
        address: string;
      };
    }[] = [];

    userBalances.forEach((callData, contractCallLabel) => {
      if (Number(callData.output.data.amount) > 0) {
        const [userAddress, poolAddress, poolId] = contractCallLabel.split('_');
        balances.push({
          id: contractCallLabel,
          poolId: Number(poolId),
          contract: poolAddress,
          balance: callData.output.data.amount,
          user: {
            address: userAddress,
          },
        });
      }
    });

    const pendingTokensCalls = new Map<string, ICallData>();
    balances.forEach((b) => {
      pendingTokensCalls.set(this.contractCallLabel(b.user.address, b.contract, b.poolId), {
        address: this.masterContract,
        abi: MasterchefAbis.pendingMojito,
        input: {
          data: [b.poolId, b.user.address],
        },
        output: {},
      });
    });

    const claimableRewardsRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      pendingTokensCalls,
      chain.id,
    );

    balances.forEach((b) => {
      const claimableReward = claimableRewardsRsp.get(
        this.contractCallLabel(b.user.address, b.contract, b.poolId),
      ).output.data;
      b.pendingMojito = new BigNumber(claimableReward.toString());
    });

    const autostakingVaultBalances = await this.getAutostakingVaultBalance(addresses, chain);
    balances.push(...autostakingVaultBalances);

    return balances;
  }

  private async getAutostakingVaultBalance(addresses: string[], chain: ChainDto) {
    const balances: {
      id: string;
      poolId: number | null;
      balance: string;
      contract: string;
      user: {
        address: string;
      };
    }[] = [];

    const vaultContract = new AutostakingVaultAbis(this.autoStakingVault);

    const vaultCalls = new Map<string, ICallData>([
      [this.balanceOfLabel(), vaultContract.balanceOf()],
      [this.totalSharesLabel(), vaultContract.totalShares()],
      ...(addresses.map((a) => [this.userInfoLabel(a), vaultContract.userInfo(a)]) as []),
    ]);

    const vaultRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      vaultCalls,
      chain.id,
    );

    const totalBalance = vaultRsp.get(this.balanceOfLabel()).output.data;
    const totalShares = vaultRsp.get(this.totalSharesLabel()).output.data;

    addresses.forEach((userAddress) => {
      const { shares: userShares } = vaultRsp.get(this.userInfoLabel(userAddress)).output.data;

      if (userShares > 0) {
        const userBalance = new BigNumber(userShares)
          .div(totalShares) //
          .multipliedBy(totalBalance);

        balances.push({
          id: this.autoStakingVault,
          poolId: null,
          balance: userBalance.toString(),
          contract: this.autoStakingVault,
          user: {
            address: userAddress,
          },
        });
      }
    });

    return balances;
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.filter((b) => b.user.address === userAddress);

    return balances;
  }

  private getStakingPositionsForAddress(balances, pools: NotifyStaking) {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const indexedSPByPoolIdAndAddress = new Map<string, IntegrationStakingPositionDto>(
      pools.items.map((sp) => [sp.address + sp.poolId, sp]),
    );
    balances.forEach((b) => {
      const stakingPosition: IntegrationStakingPositionDto = indexedSPByPoolIdAndAddress.get(
        b.contract + b.poolId,
      );

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

      stakingPosition.staked = b.balance;

      if (b.pendingMojito) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = b.pendingMojito
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }

  private contractCallLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }

  private userInfoLabel(address: string) {
    return concatStrings(AutostakingVaultAbis.userInfo.name, address);
  }

  private totalSharesLabel() {
    return concatStrings(AutostakingVaultAbis.totalShares.name);
  }

  private balanceOfLabel() {
    return concatStrings(AutostakingVaultAbis.balanceOf.name);
  }
}
