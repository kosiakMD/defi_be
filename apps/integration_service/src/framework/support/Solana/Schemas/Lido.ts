/* eslint-disable max-classes-per-file */
import { publicKey, struct, u32, u64, u8 } from '@project-serum/borsh';

const exchangeRate = (name: string) => {
  return struct(
    [
      u64('computed_in_epoch'), //
      u64('st_sol_supply'),
      u64('sol_balance'),
    ],
    name,
  );
};

const lamportsHistogram = (name: string) => {
  return struct(
    [
      u64('counts1'), //
      u64('counts2'),
      u64('counts3'),
      u64('counts4'),
      u64('counts5'),
      u64('counts6'),
      u64('counts7'),
      u64('counts8'),
      u64('counts9'),
      u64('counts10'),
      u64('counts11'),
      u64('counts12'),
      u64('total'),
    ],
    name,
  );
};
const withdrawMetric = (name: string) => {
  return struct(
    [
      u64('total_st_sol_amount'), //
      u64('total_sol_amount'),
      u64('count'),
    ],
    name,
  );
};
const metrics = (name: string) => {
  return struct(
    [
      u64('fee_treasury_sol_total'),
      u64('fee_validation_sol_total'),
      u64('fee_developer_sol_total'),
      u64('st_sol_appreciation_sol_total'),
      u64('fee_treasury_st_sol_total'),
      u64('fee_validation_st_sol_total'),
      u64('fee_developer_st_sol_total'),
      lamportsHistogram('deposit_amount'),
      withdrawMetric('withdraw_amount'),
    ],
    name,
  );
};

const rewardDistribution = (name: string) => {
  return struct(
    [
      u32('treasury_fee'), //
      u32('validation_fee'),
      u32('developer_fee'),
      u32('st_sol_appreciation'),
    ],
    name,
  );
};
const feeRecipients = (name: string) => {
  return struct(
    [
      publicKey('treasury_account'), //
      publicKey('developer_account'),
    ],
    name,
  );
};

export const LidoSchema = struct([
  u8('lido_version'),
  publicKey('manager'),
  publicKey('st_sol_mint'),
  exchangeRate('exchange_rate'),
  u8('sol_reserve_authority_bump_seed'),
  u8('stake_authority_bump_seed'),
  u8('mint_authority_bump_seed'),
  u8('rewards_withdraw_authority_bump_seed'),
  rewardDistribution('reward_distribution'),
  feeRecipients('fee_recipients'),
  metrics('metrics'),
]);
