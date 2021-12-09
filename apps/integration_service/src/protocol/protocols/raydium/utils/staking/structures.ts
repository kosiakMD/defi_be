
import BN from 'bn.js'
import {
  blob, publicKey,
  seq, struct, u128, u64, u8,
} from "./buffer-layout";

export const USER_STAKE_INFO_ACCOUNT_LAYOUT_V4 = struct([
    u64('state'),
    publicKey('poolId'),
    publicKey('stakerOwner'),
    u64('depositBalance'),
    u64('rewardDebt'),
    u64('rewardDebtB'),
    u64('test')
  ])
