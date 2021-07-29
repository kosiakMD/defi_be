import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AssetTransfersEntity } from './entities/assettransfers.entity';
import { AssetTransfersRepository } from './repositories/assettransfers.repository';
import { EventDto } from './types/event.dto';

@Injectable()
export class AssetsTransfersStore {
  constructor(
    @InjectRepository(AssetTransfersEntity) private readonly repository: AssetTransfersRepository,
  ) {}

  async getEventsBetweenBlocks(
    assetId: number,
    chainId: number,
    fromBlock: number,
    toBlock: number,
  ): Promise<EventDto[]> {
    let contractEventsQuery: string;
    if (chainId === 1) {
      contractEventsQuery = `
        select
            eth_events.block_number as blocknumber,
            eth_events.transaction_hash as transactionhash,
            eth_events.topic_1 as topic1,
            eth_events.topic_2 as topic2,
            eth_events.topic_3 as topic3,
            eth_events.topics as topics,
            eth_events.data as data,
            eth_events.log_index as logindex,
            eth_blocks.timestamp as blocktimestamp
        from eth_events
                 join eth_blocks on eth_blocks.number = eth_events.block_number
        where eth_events.block_number between ${fromBlock} and ${toBlock}  and address = (
            select assets.address from assets where assets.id = ${assetId}
        )
    `;
    } else if (chainId === 2) {
      contractEventsQuery = `
        select
            bsc_events.block_number as blocknumber,
            bsc_events.transaction_hash as transactionhash,
            bsc_events.topic_1 as topic1,
            bsc_events.topic_2 as topic2,
            bsc_events.topic_3 as topic3,
            bsc_events.topics as topics,
            bsc_events.data as data,
            bsc_events.log_index as logindex,
            bsc_blocks.timestamp as blocktimestamp
        from bsc_events
                 join bsc_blocks on bsc_blocks.number = bsc_events.block_number
        where bsc_events.block_number between ${fromBlock} and ${toBlock}  and address = (
            select assets.address from assets where assets.id = ${assetId}
        )
    `;
    } else {
      throw Error(
        `not possible to build query for asset transfers migration for chain id [${chainId}]`,
      );
    }
    const dbEvents = await this.repository.query(contractEventsQuery);
    const eventsDto: EventDto[] = [];
    dbEvents.map((e) => {
      eventsDto.push({
        txHash: e.transactionhash,
        topic1: e.topic1,
        topic2: e.topic2,
        topic3: e.topic3,
        topics: e.topics,
        data: e.data,
        blockNumber: Number(e.blocknumber),
        blockTimestamp: Number(e.blocktimestamp),
        logIndex: Number(e.logindex),
      });
    });
    return eventsDto;
  }

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

  async insertAll(transfers: AssetTransfersEntity[]): Promise<any> {
    if (transfers.length === 0) {
      return;
    }
    const queryStart = `insert into asset_transfers (id, asset_id, "from", "to", value, timestamp, tx_hash)
                        values`;

    const valuesConcatenated = transfers
      .map((t) => {
        return (
          `(
        default,
				${t.assetId}, 
				` +
          (t.from ? `'${t.from}'` : null) +
          `,
				` +
          (t.to ? `'${t.to}'` : null) +
          `,
				'${t.value}',
				${t.timestamp},
				'${t.txHash}'
				)`
        );
      })
      .join(',');

    return await this.repository.query(queryStart.concat(valuesConcatenated));
  }
}
