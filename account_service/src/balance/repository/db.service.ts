import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Address } from '../../common/interfaces';
import { Chain } from '../../common/types';
import { TokenRow } from '../interfaces/balance.interfaces';

@Injectable()
export class DbService {
  public loadErc20Balances = (addresses: Address[], chainId: Chain): Promise<TokenRow[]> => {
    // NOTE: We join addresses as there seems to be no better way to do IN query
    // We are safe with query building as parameters are validated before
    const addressesString = addresses.map((accounts) => `'${accounts}'`).join(',');
    const manager = getManager();

    return manager.query(`
      select balances.*,
        assets.address as "tokenAddress",
        assets.name as "tokenName",
        assets.symbol as "tokenSymbol",
        assets.decimals as "tokenDecimals"
      from (
        select
          address,
          asset_id,
          sum(amount) as "amount"
        from (
          select "from" as address, asset_id, -sum(value) as amount
          from asset_transfers
          where "from" in (${addressesString})
          group by "from", asset_id

          union all

          select "to" as address, asset_id, sum(value) as amount
          from asset_transfers
          where "to" in (${addressesString})
          group by "to", asset_id
        ) as reduced
      group by address, asset_id) as balances
      join assets on asset_id = assets.id
      where assets.chain_id = ${chainId} and amount > 0
    `);
  };
}
