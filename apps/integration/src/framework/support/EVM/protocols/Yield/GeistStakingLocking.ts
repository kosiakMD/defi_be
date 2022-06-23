import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { equals, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { IRewardTokenMinimal } from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenMinimal } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

type GeistSupplyTokenMinimal = ISupplyTokenMinimal<{
  lockedTotalSupply: string;
}>;
type GeistStakingFeatureMinimal = BaseWithTokens<
  GeistSupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  any
>;
export class GeistStakingLocking
  extends SingleContractProtocol<
    GeistStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IProtocolMeta & { address: string }
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
  ) {
    super();
    if (this.updateFunctionPredicates) {
      this.updateFunctionPredicates();
    }
  }

  protected updateFunctionPredicates?(): void;

  // Best Guess predicates to auto detect masterchef contract
  // Ideally in a base class such as MasterChef these will be as generic as possible and
  // attempt to get as many matches from various projects as possible
  // If a project can not be matched, this class can be extended and this can be overridden
  functionPredicates: INamedFunctionPredicates = {
    stakingToken: () => (item) => equals(item.name, 'stakingToken'),
    rewardPerToken: () => (item) => equals(item.name, 'rewardPerToken'),
    rewardData: () => (item) => equals(item.name, 'rewardData'),

    rewardTokens: () => (item) => equals(item.name, 'rewardTokens'),

    lockedBalances: () => (item) => equals(item.name, 'lockedBalances'),
    totalBalance: () => (item) => equals(item.name, 'totalBalance'),
    totalSupply: () => (item) => equals(item.name, 'totalSupply'),
    lockedSupply: () => (item) => equals(item.name, 'lockedSupply'),

    claimableRewards: () => (item) => equals(item.name, 'claimableRewards'),
  };

  /**
   * fetches all available pools on this protocol
   *
   * @param context hardcoded data & some multicall/web3 data
   * @returns full pools array
   */
  protected async fetchOpportunityData(): Promise<GeistStakingFeatureMinimal[]> {
    const contract = new DynamicContract(this.meta.address);

    const stakingToken = await this.multicall.call(
      contract.createCall(this.functions.stakingToken),
      this.meta.chain,
    );
    const totalSupply = await this.multicall.call(
      contract.createCall(this.functions.totalSupply),
      this.meta.chain,
    );
    const lockedTotalSupply = await this.multicall.call(
      contract.createCall(this.functions.lockedSupply),
      this.meta.chain,
    );

    const rewardTokens = [];

    let c0ntinue = true;

    let index = 0;
    while (c0ntinue) {
      try {
        const nextRewardToken = await this.multicall.call(
          contract.createCall(this.functions.rewardTokens, index),
          this.meta.chain,
        );
        if (nextRewardToken) {
          rewardTokens.push(nextRewardToken);
        }
      } catch (e) {
        c0ntinue = false;
      }
      index++;
    }
    const rewardPerTokens = await Promise.all(
      rewardTokens.map(
        async (token) =>
          await this.multicall.call(
            contract.createCall(this.functions.rewardPerToken, token),
            this.meta.chain,
          ),
      ),
    );
    return [
      // Staking Geist https://geist.finance/manage
      {
        id: stakingToken,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: stakingToken,
            },
            totalSupplied: new BigNumber(totalSupply)
              .minus(new BigNumber(lockedTotalSupply))
              .toString(),
          },
        ],
        rewarded: rewardTokens.slice(1).map((rewardTokenAddress, ind) => {
          return {
            token: { address: rewardTokenAddress },
            rewardPerSecond: rewardPerTokens[ind],
          };
        }),
      },
      // Locking Geist https://geist.finance/manage, rewards only in Geist
      {
        id: stakingToken + ':locked',
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: stakingToken,
            },
            totalSupplied: lockedTotalSupply,
          },
        ],
        rewarded: [
          {
            token: { address: rewardTokens[0] },
            rewardPerSecond: rewardPerTokens[0],
          },
        ],
      },
    ];
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = new DynamicContract(this.meta.address);

    const geistPrice = new BigNumber(pools[1].supplied[0].token.price);

    const lockedBalancePromise = this.multicall
      .call(contract.createCall(this.functions.lockedBalances, address), this.meta.chain)
      .then((x) => x.lockData);

    const totalBalancePromise = this.multicall.call(
      contract.createCall(this.functions.totalBalance, address),
      this.meta.chain,
    );

    const claimableRewardsPromise = this.multicall.call(
      contract.createCall(this.functions.claimableRewards, address),
      this.meta.chain,
    );
    const [lockedBalanceData, totalBalance, claimableRewards] = await Promise.all([
      lockedBalancePromise,
      totalBalancePromise,
      claimableRewardsPromise,
    ]);
    const lockedBalances: { balance: BigNumber; unlockTime: number }[] = lockedBalanceData.map(
      (x) => ({ balance: x.amount, unlockTime: x.unlockTime }),
    );

    const lockedTotalBalance = lockedBalances.reduce(
      (acc, { balance }) => acc.plus(balance),
      new BigNumber(0),
    );

    const stakedBalance = new BigNumber(totalBalance).minus(lockedTotalBalance);
    const stakedValue = new BigNumber(stakedBalance).multipliedBy(geistPrice);

    const tokenToClaimableRewardMap = new Map(claimableRewards);

    const claimable = [];
    const claimableLockedRewards = new BigNumber(
      tokenToClaimableRewardMap.get(pools[1].rewarded[0].token.address) as any,
    );

    if (claimableLockedRewards.gt(0)) {
      claimable.push(this.toClaimableItem(pools[1].rewarded[0], tokenToClaimableRewardMap));
    }
    claimable.push(
      ...pools[0].rewarded
        .filter(
          (x) =>
            tokenToClaimableRewardMap.get(x.token.address) &&
            new BigNumber(tokenToClaimableRewardMap.get(x.token.address) as any).gt(0),
        )
        .map((x) => this.toClaimableItem(x, tokenToClaimableRewardMap)),
    );
    const result: IStakingFeatureUserEntry[] = [];

    if (stakedValue.gt(0)) {
      result.push({
        id: pools[0].id,
        chain: this.meta.chain,
        feature: FeatureEnum.staking,
        supplied: [
          {
            ...pools[0].supplied[0],
            amount: normalizeDecimals(
              stakedBalance.toString(),
              pools[0].supplied[0].token.decimals,
            ),
            value: normalizeDecimals(stakedValue.toString(), pools[0].supplied[0].token.decimals),
          },
        ],
        rewarded: [],
      });
    }
    if (lockedBalances.length > 0) {
      result.push(
        ...lockedBalances.map(({ balance, unlockTime }) => ({
          id: pools[1].id,
          chain: this.meta.chain,
          feature: FeatureEnum.staking,
          supplied: [
            {
              ...pools[1].supplied[0],
              amount: normalizeDecimals(balance.toString(), pools[1].supplied[0].token.decimals),
              value: normalizeDecimals(
                // eslint-disable-next-line newline-per-chained-call
                new BigNumber(balance).multipliedBy(geistPrice).toString(),
                pools[1].supplied[0].token.decimals,
              ),
              unlockTime,
            },
          ],
          rewarded: [],
        })),
      );
    }

    if (claimable.length) {
      result.push({
        id: pools[1].id,
        chain: this.meta.chain,
        feature: FeatureEnum.claimable,
        supplied: [],
        rewarded: claimable,
      });
    }
    return result;
  }

  private toClaimableItem(rewarded, tokenToClaimableRewardMap) {
    return {
      ...rewarded,
      amount: normalizeDecimals(
        tokenToClaimableRewardMap.get(rewarded.token.address).toString(),
        rewarded.token.decimals,
      ),
      value: normalizeDecimals(
        new BigNumber(tokenToClaimableRewardMap.get(rewarded.token.address) as any)
          .multipliedBy(rewarded.token.price)
          .toString(),
        rewarded.token.decimals,
      ),
    };
  }
}
