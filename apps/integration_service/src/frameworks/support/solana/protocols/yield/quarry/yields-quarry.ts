/* eslint-disable max-classes-per-file */
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { normalizeDecimals } from '@app/common/utils';
import { toChunkedArray } from '@app/common/utils/transform';

import { IRewardTokenOpportunity } from '../../../../interfaces/tokens-rewarded.interface';
import {
  QUARRY_MERGE_MINER_LAYOUT,
  QUARRY_MERGE_POOL_LAYOUT,
  QUARRY_MINER_LAYOUT,
} from '../../../schemas/quarry';
import { accountConfig, mergePoolConfig } from './configs';
import { IQuarryStakingFeatureOpportunity } from './interfaces';
import { Payroll } from './payroll';

const QUARRY_MERGE_MINE_PROGRAM_ID = new PublicKey('QMMD16kjauP5knBwxNUJRZ1Z5o3deBuFrqVjBVmmqto');
const QUARRY_MINE_PROGRAM_ID = new PublicKey('QMNeHCGYnLVDn1icRAfQZpjPLBNkfGbSKRB83G5d8KB');

export async function fetchYieldsQuarry(
  connection: Connection,
  address: PublicKey,
  latestFarms: Map<string, IQuarryStakingFeatureOpportunity>,
) {
  const config = accountConfig(address, QUARRY_MINER_LAYOUT);
  const minersRes = await connection.getProgramAccounts(QUARRY_MINE_PROGRAM_ID, config);

  const miners = minersRes.map((minerRes) => ({
    ...QUARRY_MINER_LAYOUT.decode(minerRes.account.data),
    pubkey: minerRes.pubkey,
  }));

  if (miners.length === 0) return [];
  const myFarms = [];

  for (const miner of miners) {
    const farmAddress = miner.quarryKey.toString();
    if (!latestFarms.has(farmAddress)) continue;

    const farm = { ...latestFarms.get(farmAddress) };
    const supplied = getSupplied(farm, miner);
    const rewarded = farm.rewarded.map((rewarded) => {
      const pending = getPendingReward(farm, miner, rewarded);
      return {
        ...rewarded,
        amount: pending,
        value: pending * rewarded.token.price,
      };
    });

    delete farm.extra;
    delete farm.replicaMint;

    myFarms.push({ ...farm, supplied, rewarded });
  }
  return myFarms;
}

export async function fetchYieldsMerge(
  connection: Connection,
  address: PublicKey,
  latestFarms: Map<string, IQuarryStakingFeatureOpportunity>,
) {
  const configMergeMiner = accountConfig(address, QUARRY_MERGE_MINER_LAYOUT);

  const mergeMinersRes = await connection.getProgramAccounts(
    QUARRY_MERGE_MINE_PROGRAM_ID,
    configMergeMiner,
  );

  const mergeMiners = mergeMinersRes.map((mergeMinerRes) => ({
    ...QUARRY_MERGE_MINER_LAYOUT.decode(mergeMinerRes.account.data),
    pubkey: mergeMinerRes.pubkey,
  }));

  if (mergeMiners.length === 0) return [];

  const configMergePool = mergePoolConfig(QUARRY_MERGE_POOL_LAYOUT);

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

  const farmsByReplicaMint: Record<string, IQuarryStakingFeatureOpportunity[]> = {};

  for (const farm of latestFarms.values()) {
    if (farm.replicaMint) {
      if (!Array.isArray(farmsByReplicaMint[farm.replicaMint])) {
        farmsByReplicaMint[farm.replicaMint] = [];
      }
      farmsByReplicaMint[farm.replicaMint].push({ ...farm });
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
          new PublicKey(replicaFarm.id).toBytes(),
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

  const myFarms = [];
  for (let i = 0; i < mergeMiners.length; i += 1) {
    const mergeMiner = mergeMiners[i];
    const mergePoolAddress = mergeMiner.pool.toString();
    const mergePool = mergePoolAccountsMap.get(mergePoolAddress);
    const replicaMint = mergePool.replicaMint.toString();

    const farms = farmsByReplicaMint[replicaMint];
    if (!farms) continue;
    const mainFarm = farms.find((farm) => farm.extra.isParent === true);

    if (!mainFarm) continue;

    const supplied = getSupplied(mainFarm, mergeMiner);
    const rewards = [];
    for (const farm of farms) {
      const miner = mergeMinerMinersByPool.get(farm.id);
      if (!miner) continue;

      farm.rewarded.map((rewarded) => {
        const pending = getPendingReward(farm, miner, rewarded);

        if (pending > 0) {
          rewards.push({
            ...rewarded,
            amount: pending,
            value: pending * rewarded.token.price,
          });
        }
      });
    }

    delete mainFarm.extra;
    delete mainFarm.replicaMint;

    myFarms.push({ ...mainFarm, supplied, rewarded: rewards });
  }

  return myFarms;
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

function getSupplied(farm: IQuarryStakingFeatureOpportunity, miner: any) {
  const lp = farm.supplied[0].token;
  const balance = normalizeDecimals(miner.balance || miner.primaryBalance, lp.decimals);
  const lpShare = balance / lp.reserve;

  lp.underlying.forEach((token) => {
    token.balance = token.reserve * lpShare;
    token.value = token.balance * token.price;
    return token;
  });

  const supplied = [
    {
      token: lp,
      amount: balance,
      value: balance * lp.price,
      tvl: farm.supplied[0].tvl,
      totalSupplied: farm.supplied[0].totalSupplied,
    },
  ];

  return supplied;
}

function getPendingReward(
  farm: IQuarryStakingFeatureOpportunity,
  miner: any,
  rewards: IRewardTokenOpportunity,
) {
  const payroll = new Payroll(
    farm.extra.famineTs,
    farm.extra.lastUpdateTs,
    farm.extra.annualRewardsRate,
    farm.extra.rewardsPerTokenStored,
    farm.extra.totalTokensDeposited,
  );

  const rewardsEarned = payroll.calculateRewardsEarned(
    new BN(Math.floor(Date.now() / 1000)),
    new BN(miner.balance.toString()),
    miner.rewardsPerTokenPaid,
    new BN(miner.rewardsEarned.toString()),
  );

  return normalizeDecimals(rewardsEarned.toString(), rewards.token.decimals);
}
