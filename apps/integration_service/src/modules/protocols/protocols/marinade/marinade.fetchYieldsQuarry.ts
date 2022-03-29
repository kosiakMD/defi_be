import type { Connection, GetProgramAccountsConfig, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import BN from 'bn.js';
import { plainToClass } from 'class-transformer';

import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { quarryMinerFilters } from './utils/marinade.filters';
import { Payroll } from './utils/marinade.helpers';
import { QUARRY_MINE_PROGRAM_ID } from './utils/marinade.ids';
import { QUARRY_MINER_LAYOUT } from './utils/marinade.layouts';

export async function fetchYieldsQuarry(
  connection: Connection,
  address: PublicKey,
  latestFarms: Map<string, IntegrationStakingPositionDto>,
): Promise<IntegrationStakingPositionDto[]> {
  const config: GetProgramAccountsConfig = {
    commitment: 'confirmed',
    encoding: 'base64',
    filters: quarryMinerFilters(address),
  };

  const minersRes = await connection.getProgramAccounts(QUARRY_MINE_PROGRAM_ID, config);

  const miners = minersRes.map((minerRes) => ({
    ...QUARRY_MINER_LAYOUT.decode(minerRes.account.data),
    pubkey: minerRes.pubkey,
  }));

  if (miners.length === 0) return [];

  const stackingItems: IntegrationStakingPositionDto[] = [];
  for (let i = 0; i < miners.length; i += 1) {
    const miner = miners[i];

    const farmAddress = miner.quarryKey.toString();
    const farm = latestFarms.get(farmAddress);
    if (!farm) continue;
    const stackingItem = plainToClass(IntegrationStakingPositionDto, farm);

    const lpDecimals = farm.stakingToken.decimals;
    const lpAmount = new BigNumber(miner.balance) //
      .div(10 ** lpDecimals) //
      .toNumber();
    const lpShare = lpAmount / farm.stakingToken.balance;

    stackingItem.stakingToken.tokens.forEach((farmAsset) => {
      farmAsset.balance = lpShare * farmAsset.reserve;
      farmAsset.value = farmAsset.price * farmAsset.balance;

      delete farmAsset.positionInPool;
      delete farmAsset.tokens;
    });

    stackingItem.rewards.forEach((reward) => {
      const payroll = new Payroll(
        new BN(farm.extra.famineTs),
        new BN(farm.extra.lastUpdateTs),
        new BN(farm.extra.annualRewardsRate),
        new BN(farm.extra.rewardsPerTokenStored),
        new BN(farm.extra.totalTokensDeposited),
      );
      const rewardsEarned = payroll.calculateRewardsEarned(
        new BN(Math.floor(Date.now() / 1000)),
        new BN(miner.balance.toString()),
        miner.rewardsPerTokenPaid,
        new BN(miner.rewardsEarned.toString()),
      );

      const pending = new BigNumber(rewardsEarned.toString()) //
        .div(10 ** reward.decimals)
        .toNumber();

      reward.claimableData.balance = pending;
      reward.claimableData.value = pending * reward.price;
    });

    delete stackingItem.extra;

    stackingItems.push(stackingItem);
  }

  return stackingItems;
}
