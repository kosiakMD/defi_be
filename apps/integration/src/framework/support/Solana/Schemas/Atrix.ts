import { publicKey, u64, u128 } from '@project-serum/borsh';
import { blob, struct, u8 } from 'buffer-layout';

export const STAKER_ACCOUNT_LAYOUT = struct([
  blob(8),
  u8('bump'),
  publicKey('farmAccount'),
  publicKey('authority'),
  u64('stakedAmount'),
]);

export const HARVESTER_ACCOUNT_LAYOUT = struct([
  blob(8),
  u8('bump'),
  publicKey('cropAccount'),
  u128('rewardDebt'),
  u64('earnedRewards'),
  publicKey('authority'),
]);

export const FARM_ACCOUNT_LAYOUT = struct([
  blob(8),
  publicKey('base'),
  u8('bump'),
  publicKey('stakeMint'),
  publicKey('farmStakeTokenAccount'),
  publicKey('authority'),
]);
