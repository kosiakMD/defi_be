import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Address } from '../../common/interfaces';
import { ChainId } from '../../common/types';
import { TokenRow } from '../interfaces/balance.interfaces';

@Injectable()
export class DbService {
  public loadErc20Balances = (addresses: Address[], chainId: ChainId): Promise<TokenRow[]> => {
    // NOTE: We join addresses as there seems to be no better way to do IN query
    // We are safe with query building as parameters are validated before
    const addressesString = addresses.map((accounts) => `'${accounts}'`).join(',');
    const manager = getManager();

    return manager.query(`
      select balances.*,
        assets_new.address as "tokenAddress",
        assets_new.name as "tokenName",
        assets_new.symbol as "tokenSymbol",
        assets_new.decimals as "tokenDecimals",
        assets_new.is_lp as "isLp"
      from (
        select
          address,
          asset_id,
          sum(amount) as "amount"
        from (
          select "from" as address, asset_id, -sum(value) as amount
          from asset_transfers_new
          where "from" in (${addressesString})
          group by "from", asset_id

          union all

          select "to" as address, asset_id, sum(value) as amount
          from asset_transfers_new
          where "to" in (${addressesString})
          group by "to", asset_id
        ) as reduced
      group by address, asset_id) as balances
      join assets_new on asset_id = assets_new.id
      where assets_new.is_migrated = true and assets_new.chain_id = ${chainId} and amount > 0
    `);
  };
}
