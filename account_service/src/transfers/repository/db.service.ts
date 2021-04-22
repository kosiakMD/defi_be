import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { CHAIN_ID_BSC } from '../../utils/utils';

@Injectable()
export class DbService {
  async getTransfersDataFromDb(addresses: string, chainId: number) {
    const [transactionTable, tokenTable] =
      chainId === CHAIN_ID_BSC ? ['bsc_transfers', 'bsc_token'] : ['transactions', 'token'];

    const manager = getManager();
    return await manager.query(`
      select 
      ${transactionTable}.hash AS hash,
        ${transactionTable}."blockNumber" AS "blockNumber",
        ${transactionTable}."fromAddress" AS "fromAddress",
        ${transactionTable}."toAddress" AS "toAddress",
        ${transactionTable}."blockTimestamp" AS "blockTimeStamp",
        ${transactionTable}."gasUsed" AS "gas",
        ${transactionTable}."gasPrice" AS "gasPrice",
        ${transactionTable}."amount" AS "amount",
        ${transactionTable}."tokenAddress" AS "tokenAddress",
        ${transactionTable}."tokenprice" AS "tokenPrice",
        ${transactionTable}."ethprice" AS "ethPrice",
        ${tokenTable}.name AS "tokenName",
        ${tokenTable}.symbol AS "tokenSymbol",
        ${tokenTable}.decimals AS "tokenDecimals",
        ${tokenTable}."totalSupply" AS "tokenTotalSupply" 
      from ${transactionTable} 
      left join ${tokenTable} 
      on ${transactionTable}."tokenAddress" = ${tokenTable}.address
    where ${transactionTable}."fromAddress" IN (${addresses})
    or ${transactionTable}."toAddress" IN (${addresses})
    order by ${transactionTable}.id DESC
    limit 5000`);
  }
}
