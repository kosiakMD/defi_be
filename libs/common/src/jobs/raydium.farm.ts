import { blob, publicKey, seq, struct, u128, u64, u8 } from '@raydium-io/raydium-sdk';

export class RaydiumFarm {
  public static version3 = {
    programId: 'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q',
    stakeInfoLayout: struct([
      u64('state'),
      u64('nonce'),
      publicKey('poolLpTokenAccount'),
      publicKey('poolRewardTokenAccount'),
      publicKey('owner'),
      publicKey('feeOwner'),
      u64('feeY'),
      u64('feeX'),
      u64('totalReward'),
      u128('rewardPerShareNet'),
      u64('lastBlock'),
      u64('rewardPerBlock'),
    ]),
    userInfoLayout: struct([
      u64('state'),
      publicKey('poolId'),
      publicKey('stakerOwner'),
      u64('depositBalance'),
      u64('rewardDebt'),
    ]),
  };
  public static version4 = {
    programId: 'CBuCnLe26faBpcBP2fktp4rp8abpcAnTWft6ZrP5Q4T',
    stakeInfoLayout: struct([
      u64('state'),
      u64('nonce'),
      publicKey('poolLpTokenAccount'),
      publicKey('poolRewardTokenAccount'),
      u64('totalReward'),
      u128('perShare'),
      u64('perBlock'),
      u8('option'),
      publicKey('poolRewardTokenAccountB'),
      blob(7),
      u64('totalRewardB'),
      u128('perShareB'),
      u64('perBlockB'),
      u64('lastBlock'),
      publicKey('owner'),
    ]),
    userInfoLayout: struct([
      u64('state'),
      publicKey('poolId'),
      publicKey('stakerOwner'),
      u64('depositBalance'),
      u64('rewardDebt'),
      u64('rewardDebtB'),
    ]),
  };
  public static version5 = {
    programId: '9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z',
    stakeInfoLayout: struct([
      u64('state'),
      u64('nonce'),
      publicKey('poolLpTokenAccount'),
      publicKey('poolRewardTokenAccount'),
      u64('totalReward'),
      u128('perShare'),
      u64('perBlock'),
      u8('option'),
      publicKey('poolRewardTokenAccountB'),
      blob(7),
      u64('totalRewardB'),
      u128('perShareB'),
      u64('perBlockB'),
      u64('lastBlock'),
      publicKey('owner'),
    ]),
    userInfoLayout: struct([
      u64('state'),
      publicKey('poolId'),
      publicKey('stakerOwner'),
      u64('depositBalance'),
      u128('rewardDebt'),
      u128('rewardDebtB'),
      seq(u64(), 17),
    ]),
  };
  public static version31 = {
    ...RaydiumFarm.version3,
    userInfoLayout: struct([
      u64('state'),
      publicKey('poolId'),
      publicKey('stakerOwner'),
      u64('depositBalance'),
      u128('rewardDebt'),
      seq(u64(), 17),
    ]),
  };
  public static version3SingleTokens = ['4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW'];
}

export enum RaydiumFarmVersion {
  version3 = 3,
  version4 = 4,
  version5 = 5,
}
