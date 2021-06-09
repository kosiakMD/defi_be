import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { LiquidityPositionSnapshot } from '../../thegraph/uniswap/liquidity.position.snapshot';
import { Transaction } from '../../thegraph/uniswap/transaction';
import { DatabaseService } from './database.service';

@Injectable()
export class DatabaseManagerUniswap {
  protected mintsTableName = 'uniswap_mints';
  protected burnsTableName = 'uniswap_burns';
  protected swapsTableName = 'uniswap_swaps';
  protected snapshotsTableName = 'uniswap_snapshots';
  constructor(
    protected databaseService: DatabaseService,
    protected configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  async getLastDatabaseBlock(): Promise<number | null> {
    const databaseClient = await this.databaseService.getClient();
    const query = `
        select max(latest_block)
        from (
                 select max(mints.block) as latest_block
                 from ((select block_number as block
                        from ${this.mintsTableName}
                        order by id desc
                        limit 100)) mints
                 union
                 select max(burns.block) as latest_block
                 from ((select block_number as block
                        from ${this.burnsTableName}
                        order by id desc
                        limit 100)) burns
                 union 
                 select max(swaps.block) as latest_block
                 from ((select block_number as block
                        from ${this.swapsTableName}
                        order by id desc
                        limit 100)) swaps
                 union 
                 select max(snapshots.block) as latest_block
                 from ((select block_number as block
                        from ${this.snapshotsTableName}
                        order by id desc
                        limit 100)) snapshots
             ) uni_blocks`;
    const res = await databaseClient.query(query);
    const maxBlock = res.rows[0]?.max;
    return maxBlock ? Number(maxBlock) : null;
  }

  static getSqlValuesToInsert(transactions: Transaction[], field: string): string {
    const isSwap = field === 'swaps';
    return transactions
      .filter((transaction) => transaction[field] && transaction[field].length)
      .map((transaction) => {
        return transaction[field]
          .map(
            (element) =>
              `(
							'${element.sender}',
							'${element.to}',
							'${JSON.stringify(element).replace("'", "''")}',
							current_timestamp, 
							${transaction.blockNumber}
							${isSwap ? `, '${element.from}'` : ''}
							)`,
          )
          .join(',');
      })
      .join(',');
  }

  static getSqlSnapshotsValuesToInsert(snapshots: LiquidityPositionSnapshot[]): string {
    return snapshots
      .map(
        (snapshot) =>
          `(
					'${snapshot.user.id}', 
					'${JSON.stringify(snapshot).replace("'", "''")}', 
					${snapshot.block}, 
					current_timestamp
					)`,
      )
      .join(',');
  }

  async insertTransactionValues(values: string, field: string) {
    if (!values) {
      return;
    }

    let insertQueryStart: string;
    switch (field) {
      case 'mints':
        insertQueryStart = `insert into ${this.mintsTableName} (sender, to_address, information, created_at, block_number) values `;
        break;
      case 'burns':
        insertQueryStart = `insert into ${this.burnsTableName} (sender, to_address, information, created_at, block_number) values `;
        break;
      case 'swaps':
        insertQueryStart = `insert into ${this.swapsTableName} (sender, to_address, information, created_at, block_number, from_address) values `;
        break;
      case 'snapshots':
        insertQueryStart = `insert into ${this.snapshotsTableName} (user_address, information, block_number, created_at) values `;
        break;
    }

    const databaseClient = await this.databaseService.getClient();
    return databaseClient.query(insertQueryStart.concat(values));
  }
}
