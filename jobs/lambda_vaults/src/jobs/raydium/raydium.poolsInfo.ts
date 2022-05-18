import { Liquidity, LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { map } from 'rxjs';

import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { solanaStringsToKeys } from '@app/common/utils/solana';
import { toChunkedArray } from '@app/common/utils/transform';

const RPC_URL = new ConfigService().get('SOL_URL');
const LIMIT_PER_REQUEST = 50;

export function generateTx(pool, blockHash: string) {
  const instructions = [
    Liquidity.makeSimulatePoolInfoInstruction({
      poolKeys: solanaStringsToKeys(pool) as LiquidityPoolKeysV4,
    }),
  ];
  const transaction = new Transaction({
    feePayer: new PublicKey('RaydiumSimuLateTransaction11111111111111111'),
  });

  for (const instruction of instructions) {
    transaction.add(instruction);
  }

  transaction.recentBlockhash = blockHash;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const message = transaction._compile();
  const signData = message.serialize();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const wireTransaction = transaction._serialize(signData);

  const encodedTransaction = wireTransaction.toString('base64');
  const config = {
    encoding: 'base64',
    // commitment: this.commitment
  };
  const args = [encodedTransaction, config];

  return args;
}

export async function getInfoPools(connection: Connection, httpService: HttpService, listPools) {
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const listTx = [];
  for (let i = 0; i < listPools.length; i++) {
    const pool = listPools[i];
    const tx = generateTx(pool, blockhash);
    listTx.push({
      jsonrpc: '2.0',
      id: i + '::' + pool.id,
      method: 'simulateTransaction',
      params: tx,
    });
  }

  const chunks = toChunkedArray(listTx, LIMIT_PER_REQUEST);
  const responses = [];
  for (const chunk of chunks) {
    const request = await httpService
      .post(RPC_URL, chunk)
      .pipe(map((d: any) => d.data))
      .toPromise();
    responses.push(...request);
  }

  return responses;
}

export function decodeTxLogs(logs): {
  status: string;
  baseDecimals: string;
  quoteDecimals: string;
  lpDecimals: string;
  baseReserve: string;
  quoteReserve: string;
  lpSupply: string;
  ammId: string;
} {
  const log = logs.find((l) => l.includes('GetPoolData'));

  const status = getSimulateValue(log, 'status');
  const baseDecimals = getSimulateValue(log, 'coin_decimals');
  const quoteDecimals = getSimulateValue(log, 'pc_decimals');
  const lpDecimals = getSimulateValue(log, 'lp_decimals');
  const baseReserve = getSimulateValue(log, 'pool_coin_amount');
  const quoteReserve = getSimulateValue(log, 'pool_pc_amount');
  const lpSupply = getSimulateValue(log, 'pool_lp_supply');
  const ammId = getSimulateValue(log, 'amm_id');

  return {
    status,
    baseDecimals,
    quoteDecimals,
    lpDecimals,
    baseReserve,
    quoteReserve,
    lpSupply,
    ammId,
  };
}

function getSimulateValue(value, key) {
  const reg =
    key === 'amm_id'
      ? new RegExp(`"${key}":"([A-Za-z0-9]+)"`, 'g')
      : new RegExp(`"${key}":(\\d+)`, 'g');

  const foundData = reg.exec(value);
  const result = foundData ? foundData[1] : '';
  return result;
}
