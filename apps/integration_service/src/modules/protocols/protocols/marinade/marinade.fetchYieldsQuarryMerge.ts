import type { Connection, GetProgramAccountsConfig } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import BN from 'bn.js';
import { plainToClass } from 'class-transformer';

import {
  IntegrationClaimableTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { toChunkedArray } from '@app/common/utils/transform';

import { quarryMergeMinerFilters, quarryMergePoolFilters } from './utils/marinade.filters';
import { Payroll } from './utils/marinade.helpers';
import { QUARRY_MERGE_MINE_PROGRAM_ID, QUARRY_MINE_PROGRAM_ID } from './utils/marinade.ids';
import {
  QUARRY_MERGE_MINER_LAYOUT,
  QUARRY_MERGE_POOL_LAYOUT,
  QUARRY_MINER_LAYOUT,
} from './utils/marinade.layouts';

export async function fetchYieldsQuarryMerge(
  connection: Connection,
  address: PublicKey,
  latestFarms: Map<string, IntegrationStakingPositionDto>,
): Promise<IntegrationStakingPositionDto[]> {
  const configMergeMiner: GetProgramAccountsConfig = {
    commitment: 'confirmed',
    encoding: 'base64',
    filters: quarryMergeMinerFilters(address),
  };
  const mergeMinersRes = await connection.getProgramAccounts(
    QUARRY_MERGE_MINE_PROGRAM_ID,
    configMergeMiner,
  );

  const mergeMiners = mergeMinersRes.map((mergeMinerRes) => ({
    ...QUARRY_MERGE_MINER_LAYOUT.decode(mergeMinerRes.account.data),
    pubkey: mergeMinerRes.pubkey,
  }));
  if (mergeMiners.length === 0) return [];

  const configMergePool: GetProgramAccountsConfig = {
    commitment: 'confirmed',
    encoding: 'base64',
    filters: quarryMergePoolFilters,
  };

  const mergePoolAccountsRes = await connection.getProgramAccounts(
    QUARRY_MERGE_MINE_PROGRAM_ID,
    configMergePool,
  );

  const mergePoolAccountsMap = new Map();
  mergePoolAccountsRes.forEach((mergePoolAccountRes) => {
    const mergePoolAccount = {
      ...QUARRY_MERGE_POOL_LAYOUT.decode(mergePoolAccountRes.account.data),
      pubkey: mergePoolAccountRes.pubkey,
    };
    mergePoolAccountsMap.set(mergePoolAccountRes.pubkey.toString(), mergePoolAccount);
  });

  const farmsByReplicaMint: Record<string, IntegrationStakingPositionDto[]> = {};

  for (const farm of latestFarms.values()) {
    if (farm.extra.replicaMint) {
      if (!Array.isArray(farmsByReplicaMint[farm.extra.replicaMint])) {
        farmsByReplicaMint[farm.extra.replicaMint] = [];
      }
      farmsByReplicaMint[farm.extra.replicaMint].push(farm);
    }
  }

  const mergeMinersMinersAddresses = [];
  for (const mergeMiner of mergeMiners) {
    const mergePoolAddress = mergeMiner.pool.toString();
    const mergePool = mergePoolAccountsMap.get(mergePoolAddress);
    const replicaMint = mergePool.replicaMint.toString();
    const farms = farmsByReplicaMint[replicaMint];
    if (!farms) continue;

    for (const replicaFarm of farms) {
      const [minerAddress] = await PublicKey.findProgramAddress(
        [
          Buffer.from('Miner'),
          new PublicKey(replicaFarm.address).toBytes(),
          mergeMiner.pubkey.toBytes(),
        ],
        QUARRY_MINE_PROGRAM_ID,
      );
      mergeMinersMinersAddresses.push(minerAddress);
    }
  }

  const mergeMinerMinersRes = await safeGetMultipleAccountsInfo(
    connection,
    mergeMinersMinersAddresses,
  );

  const mergeMinerMinersByPool = new Map();
  mergeMinerMinersRes.forEach((mergeMinerMinerRes) => {
    if (!mergeMinerMinerRes) return;
    const mergeMinerMiner = { ...QUARRY_MINER_LAYOUT.decode(mergeMinerMinerRes.data) };
    mergeMinerMinersByPool.set(mergeMinerMiner.quarryKey.toString(), mergeMinerMiner);
  });

  const stackingItems: IntegrationStakingPositionDto[] = [];

  for (let i = 0; i < mergeMiners.length; i += 1) {
    const mergeMiner = mergeMiners[i];
    const mergePoolAddress = mergeMiner.pool.toString();
    const mergePool = mergePoolAccountsMap.get(mergePoolAddress);
    const replicaMint = mergePool.replicaMint.toString();

    const farms = farmsByReplicaMint[replicaMint];
    if (farms.length === 0) continue;
    const farm = farms[0];
    const stackingItem = plainToClass(IntegrationStakingPositionDto, farm);

    const lpDecimals = farm.stakingToken.decimals;
    const lpAmount = new BigNumber(mergeMiner.primaryBalance) //
      .div(10 ** lpDecimals) //
      .toNumber();
    const lpShare = lpAmount / farm.stakingToken.balance;

    stackingItem.stakingToken.tokens.forEach((farmAsset) => {
      farmAsset.balance = lpShare * farmAsset.reserve;
      farmAsset.value = farmAsset.price * farmAsset.balance;

      delete farmAsset.positionInPool;
      delete farmAsset.tokens;
    });

    const rewardAssets: IntegrationClaimableTokenDto[] = [];
    for (const farm of farms) {
      const miner = mergeMinerMinersByPool.get(farm.address);
      if (!miner) continue;

      farm.rewards.forEach((reward) => {
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

        if (pending > 0) {
          const rewardAsset = plainToClass(IntegrationClaimableTokenDto, reward);
          rewardAsset.claimableData.balance = pending;
          rewardAsset.claimableData.value = pending * reward.price;
          rewardAssets.push(rewardAsset);
        }
      });
    }

    delete stackingItem.extra;
    stackingItem.rewards = rewardAssets;
    stackingItems.push(stackingItem);
  }

  return stackingItems;
}

async function safeGetMultipleAccountsInfo(connection: Connection, publicKeys: PublicKey[]) {
  if (publicKeys.length <= 100) {
    return connection.getMultipleAccountsInfo(publicKeys);
  }
  const accountsInfo = [];

  const chunkArray = toChunkedArray(publicKeys, 80);

  for (const chunk of chunkArray) {
    const accountsInfoRes = await connection.getMultipleAccountsInfo(chunk);
    accountsInfo.push(...accountsInfoRes);
  }

  return accountsInfo;
}
