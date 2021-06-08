import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Address } from '../../common/interfaces';
import { TransactionWithToken } from '../interfaces/transfers.interfaces';

@Injectable()
export class DbService {
  async getTransfersDataFromDb(addresses: Address[],  chainId: number): Promise<any> {
    const addressesString = addresses.map((address) => `'${address}'`).join(',');
    const manager = getManager();

    return await manager.query(`
      select
        asset_transfers.tx_hash AS hash,
        asset_transfers.from AS fromaddress,
        asset_transfers.to AS toaddress,
        asset_transfers.timestamp AS blocktimestamp,
        assets.name AS tokenname,
        assets.symbol AS tokensymbol,
        assets.decimals AS tokendecimals
      from asset_transfers
      left join assets on asset_transfers.asset_id = assets.id
      where assets.chain_id = ${chainId} and (
          asset_transfers.from IN (${addressesString})
            or asset_transfers.to IN (${addressesString})
          )
      order by asset_transfers.id DESC
      limit 10000
    `);
  }
}
