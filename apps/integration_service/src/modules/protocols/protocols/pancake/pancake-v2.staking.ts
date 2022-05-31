import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { CallData } from '../../../../common/dto/call.dto';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import {
  Balance,
  Pancakev2MainStakingSubgraph,
} from '../../../subgraph/subgraphs/pancakev2-main-staking.subgraph';
import { PancakeAbis } from './contracts/pancake.abis';

@Injectable()
export class PancakeV2Staking {
  private readonly multicall: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly v2MainStakingSubgraph: Pancakev2MainStakingSubgraph,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicall = multicallProvider.getForChain(ChainAbbrEnum.bnb);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${PancakeProtocolEnum.pancakeV2}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const cachedPoolsMap = new Map<string, IntegrationStakingPositionDto>(
      cachedPools.items.map((cpi) => [cpi.poolId.toString(), cpi]),
    );

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.pancake,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const balances: Balance[] = await this.v2MainStakingSubgraph.getBalances(addresses);
    let claimableData: Map<string, CallData> = new Map<string, CallData>();
    // we have only non zero balances here, so we can do this mapping:
    balances.forEach((b) => {
      const [, /*address */ id] = b.id.split('-');
      const vault = cachedPoolsMap.get(id);
      if (!vault) return;
      const stakingPosition: IntegrationStakingPositionDto = vault;
      // simple rewrite vault values with user values
      const balance = new BN(b.balance).div(decimalsDivider(vault.stakingToken.decimals));
      if (vault.stakingToken.tokens.length !== 0) {
        // for lp token we calculate pool share
        const poolShare = balance.div(new BN(vault.stakingToken.totalSupply));
        stakingPosition.staked = balance.toString();
        stakingPosition.stakingToken.tokens.forEach((st) => {
          st.price = null;
          st.value = null;
          st.balance = poolShare.multipliedBy(st.reserve).toNumber();
        });
      } else {
        stakingPosition.stakingToken = {
          ...stakingPosition.stakingToken,
          balance: balance.toNumber(),
          price: null,
          value: null,
        };
      }

      stakingPosition.rewards.forEach((r) => {
        r.claimableData = { balance: null, value: null };
        r.price = null;
      });
      baseDataStakingMap.get(b.user.id).items.push(stakingPosition);
      // adding also call to get claimable rewards for future
      claimableData.set(
        PancakeV2Staking.pendingCakeLabel(b.user.id, vault),
        plainToClass(CallData, {
          address: PancakeAbis.mcv2.address,
          abi: PancakeAbis.mcv2.pendingCake,
          input: {
            data: [vault.poolId, b.user.id],
          },
        }),
      );
    });

    claimableData = await this.multicall.handleInBatches(claimableData);
    // add claimable values
    for (const key of baseDataStakingMap.keys()) {
      baseDataStakingMap.get(key).items.forEach((sp) => {
        sp.rewards.forEach((rt) => {
          rt.claimableData.balance = new BN(
            claimableData.get(PancakeV2Staking.pendingCakeLabel(key, sp)).output.data,
          )
            .div(decimalsDivider(rt.decimals))
            .toNumber();
        });
      });
    }

    return Array.from(baseDataStakingMap.values());
  }

  private static pendingCakeLabel(userAddress: string, vault: IntegrationStakingPositionDto) {
    return concatStrings(PancakeAbis.mcv2.address, vault.poolId, userAddress);
  }
}
