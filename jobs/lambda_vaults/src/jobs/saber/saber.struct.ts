import { i64, publicKey, u64 } from '@project-serum/borsh';
import { u8, u16, struct } from 'buffer-layout';

export const quarryMineStruct = struct([
  u64('lastUpdateTs'),
  publicKey('rewarderKey'),
  publicKey('tokenMintKey'),
  u16('index'),
  u8('bump'),
  u8('tokenMintDecimals'),
  i64('famineTs'),
  u64('lastCheckpointTs'),
  u64('rewardsPerTokenStored'),
  u64('rewardsShare'),
  u64('annualRewardsRate'),
  u64('numMiners'),
  u64('totalTokensDeposited'),
]);
