import { PublicKey, Connection } from '@solana/web3.js';

import { Address, ChainDto, FeatureEnum, ProtocolTypeEnum } from '@app/common';

import { offset } from './buffer-layout';
import { USER_STAKE_INFO_ACCOUNT_LAYOUT_V4 } from './structures';

export interface getFilteredProgramAccountsResults {
  publicKey: PublicKey;
  accountInfo: {
    data: Buffer;
    executable: string;
    owner: PublicKey;
    lamports: string;
  };
}

export interface stakeAccount {
  poolId: string;
  depositBalance: number;
  rewardDebt: number;
  rewardDebtB: number;
  stakeAccountAddress: string;
}

export const getFilteredProgramAccounts = async (opts: {
  connection: Connection;
  addresses: Address[];
  offset?: number;
  encoding?: string;
  programId: PublicKey;
}): Promise<getFilteredProgramAccountsResults[]> => {
  const offset = opts.offset || 40;
  const encoding = opts.encoding || 'base64';
  const addressesFilters = opts.addresses.map((a) => {
    return {
      memcmp: {
        bytes: new PublicKey(a).toBase58(),
        offset,
      },
    };
  });
  //@ts-ignore
  const resp = await opts.connection._rpcRequest('getProgramAccounts', [
    new PublicKey(opts.programId).toBase58(),
    {
      filters: addressesFilters,
      encoding,
    },
  ]);

  return await resp.result.map(
    ({
      pubkey,
      account: { data, executable, owner, lamports },
    }): getFilteredProgramAccountsResults => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data: Buffer.from(data[0], 'base64'),
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    }),
  );
};

export const getBigNumber = (num: any) => {
  return num === undefined || num === null ? 0 : parseFloat(num.toString());
};

export const getListInfo = async (
  connection: Connection,
  addresses: Address[],
  idProgram: string,
) => {
  const programId = new PublicKey(idProgram);
  const accountInfos = await getFilteredProgramAccounts({
    connection,
    addresses: addresses,
    programId,
  });
  const stakeAccounts = [];

  for (const accountInfo of accountInfos) {
    const { data } = accountInfo.accountInfo;
    const LAYOUT = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4;
    const userStakeInfo = LAYOUT.decode(data);
    const poolId = userStakeInfo.poolId.toBase58();
    const rewardDebt = getBigNumber(userStakeInfo.rewardDebt);
    const rewardDebtB = getBigNumber(userStakeInfo.rewardDebtB);
    const depositBalance = getBigNumber(userStakeInfo.depositBalance);

    stakeAccounts.push({
      poolId,
      depositBalance: depositBalance,
      rewardDebt: rewardDebt,
      rewardDebtB: rewardDebtB,
      stakeAccountAddress: accountInfo.publicKey.toBase58(),
    });
  }

  return stakeAccounts;
};
