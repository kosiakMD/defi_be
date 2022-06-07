import { publicKey, u128, u64, i64 } from '@project-serum/borsh';
import { blob, struct, u8, u16, seq } from 'buffer-layout';

export const QUARRY_QUARRY_LAYOUT = struct([
  blob(8),
  publicKey('rewarderKey'),
  publicKey('tokenMintKey'),
  u8('bump'),
  u16('index'),
  u8('tokenMintDecimals'),
  i64('famineTs'),
  i64('lastUpdateTs'),
  u128('rewardsPerTokenStored'),
  u64('annualRewardsRate'),
  u64('rewardsShare'),
  u64('totalTokensDeposited'),
  u64('numMiners'),
]);

export const QUARRY_MERGE_POOL_LAYOUT = struct([
  blob(8),
  publicKey('primaryMint'),
  u8('bump'),
  publicKey('replicaMint'),
  u64('mmCount'),
  u64('totalPrimaryBalance'),
  u64('totalReplicaBalance'),
  seq(u64(), 16, 'reserved'),
]);

export const QUARRY_MINER_LAYOUT = struct([
  blob(8),
  publicKey('quarryKey'),
  publicKey('owner'),
  u8('bump'),
  publicKey('tokenVaultKey'),
  u64('rewardsEarned'),
  u128('rewardsPerTokenPaid'),
  u64('balance'),
  u64('index'),
]);

export const QUARRY_MERGE_MINER_LAYOUT = struct([
  blob(8),
  publicKey('pool'),
  publicKey('owner'),
  u8('bump'),
  u64('index'),
  u64('primaryBalance'),
  u64('replicaBalance'),
]);

export const QUARRY_MINT_WRAPPER_LAYOUT = struct([
  blob(8),
  publicKey('base'),
  u8('bump'),
  u64('hardCap'),
  publicKey('admin'),
  publicKey('pendingAdmin'),
  publicKey('tokenMint'),
  u64('numMinters'),
  u64('totalAllowance'),
  u64('totalMinted'),
]);

export const QUARRY_REDEEMER_LAYOUT = struct([
  blob(8),
  publicKey('iouMint'),
  publicKey('redemptionMint'),
  u8('bump'),
  u64('totalTokensRedeemed'),
]);
