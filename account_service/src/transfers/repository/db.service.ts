import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Address } from '../../common/interfaces';
import { TransactionWithToken } from '../interfaces/transfers.interfaces';

@Injectable()
export class DbService {
  async getTransfersDataFromDb(addresses: Address[]): Promise<TransactionWithToken[]> {
    const addressesString = addresses.map((address) => `'${address}'`).join(',');
    const manager = getManager();

    return await manager.query(`
      select
        asset_transfers.tx_hash AS hash,
        asset_transfers.from AS fromAddress,
        asset_transfers.to AS toAddress,
        asset_transfers.timestamp AS blockTimeStamp,
        assets.name AS tokenName,
        assets.symbol AS tokenSymbol,
        assets.decimals AS tokenDecimals
      from asset_transfers
      left join assets on asset_transfers.asset_id = assets.id
      where asset_transfers.from IN (${addressesString})
      or asset_transfers.to IN (${addressesString})
      order by asset_transfers.id DESC
      limit 1000
    `);
  }
}
