import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AssetTransfersEntity } from './entities/assettransfers.entity';
import { AssetTransfersRepository } from './repositories/assettransfers.repository';

@Injectable()
export class AssetsTransfersStore {
  constructor(
    @InjectRepository(AssetTransfersEntity) private readonly repository: AssetTransfersRepository,
  ) {}

  async save(transfer: AssetTransfersEntity): Promise<any> {
    if (!transfer) {
      return;
    }
    const insertQuery =
      `insert into asset_transfers_new (asset_id, "from", "to", value, timestamp, tx_hash, block_number, log_index) 
        values (
                ${transfer.assetId}, 
                ` +
      (transfer.from ? `'${transfer.from}'` : null) +
      `,
                ` +
      (transfer.to ? `'${transfer.to}'` : null) +
      `,
                 '${transfer.value}', 
                 ${transfer.timestamp},
                 '${transfer.txHash}',
                 ${transfer.blockNumber},
                 ${transfer.logIndex}
                 ) on conflict (tx_hash, log_index) do nothing`;

    return await this.repository.query(insertQuery);
  }
}
