import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { TokenRow } from '../interfaces/balance.interfaces';

@Injectable()
export class DbService {
  public loadErc20Balances = (
    accounts: string[],
    chainId: number,
    excludedAddresses?: string,
  ): Promise<TokenRow[]> => {
    const [transactionTable, tokenTable] =
      chainId === 1 ? ['transactions', 'token'] : ['bsc_transfers', 'bsc_token'];

    const manager = getManager();
    // NOTE: We join addresses as there seems to be no better way to do IN query
    // We are safe with query building as parameters are validated before
    const addresses = accounts.map((accounts) => `'${accounts}'`).join(',');

    return manager.query(`
      select balances.*,
        ${tokenTable}.name as "tokenName",
        ${tokenTable}.symbol as "tokenSymbol",
        ${tokenTable}.decimals as "tokenDecimals",
        ${tokenTable}."totalSupply" as "tokenTotalSupply"
      from (
        select
          address,
          "tokenAddress",
          sum(amount) as "amount"
        from (
          select "fromAddress" as address, "tokenAddress", -sum(amount) as amount
          from ${transactionTable}
          where "fromAddress" in (${addresses})
          group by "fromAddress", "tokenAddress"

          union all

          select "toAddress" as address, "tokenAddress", sum(amount) as amount
          from ${transactionTable}
          where "toAddress" in (${addresses})
          group by "toAddress", "tokenAddress"
        ) as reduced
      group by address, "tokenAddress") as balances
      join ${tokenTable} on "tokenAddress" = ${tokenTable}."address"
      where amount > 0 and "tokenAddress" not in ('${excludedAddresses ? excludedAddresses : ''}')
    `);
  };
}
