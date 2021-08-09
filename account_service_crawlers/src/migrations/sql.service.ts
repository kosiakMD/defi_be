import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import Web3 from 'web3';

import { Inject, Injectable, LoggerService } from '@nestjs/common';

import {
  BLOCKS_INFO,
  BSC_BLOCKS,
  BSC_BLOCKS_INFO,
  BSC_EVENTS,
  BSC_TRANSACTIONS,
  ETH_BLOCKS,
  ETH_EVENTS,
  ETH_TRANSACTIONS,
} from '../utils/utils';
import { MigrationBlockResponse } from './interfaces/migration.block.response';
import { Log } from './interfaces/migration.event.interfaces';
import { BlockTransactionObject } from './interfaces/web3.interfaces';

@Injectable()
export class SqlService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  getBlocksAndTransactionsSqlStrings(
    blockResponse: BlockTransactionObject[],
    transactionsTable: string,
    blocksTable: string,
  ): MigrationBlockResponse {
    const blockSqlArray = [];
    const transactionSqlArray = [];

    blockResponse.forEach((block) => {
      block.transactions.forEach((transaction) => {
        transactionSqlArray.push(
          `('${transaction.hash}',${transaction.blockNumber},'${transaction.from}',
          '${transaction.to}','${transaction.input}',${new BigNumber(transaction.value).toNumber()},
          ${transaction.gas},${new BigNumber(transaction.gasPrice).toNumber()},'${
            transaction.transactionIndex
          }')`,
        );
      });

      blockSqlArray.push(`(
        ${block.number},
        '${block.timestamp}',
        '${block.hash}')`);
    });

    this.logger.log('TRANSACTION length ----> ' + transactionSqlArray.length);
    this.logger.log('BLOCKS length ----> ' + blockSqlArray.length);

    const blocksString = blockSqlArray.join(',');
    const transactionsString = transactionSqlArray.join(',');

    const blocksInsertSql = this.insertTransactionValues(blocksString, blocksTable);
    const transactionsInsertSql = this.insertTransactionValues(
      transactionsString,
      transactionsTable,
    );

    return { blocksInsertSql, transactionsInsertSql };
  }

  getEventsSqlString(eventResponse: Log[], eventsTable: string): string {
    const eventsValuesStr = eventResponse
      .map((event) => {
        const otherTopicsArray =
          event.topics && event.topics.length > 3 ? `'${event.topics.slice(3).join(', ')}'` : null;

        const topic1 = event.topics[0] ? `'${event.topics[0]}'` : null;
        const topic2 = event.topics[1] ? `'${event.topics[1]}'` : null;
        const topic3 = event.topics[2] ? `'${event.topics[2]}'` : null;

        return `(
					   '${event.transactionHash}', 
					   ${topic1}, 
					   ${topic2},
					   ${topic3},
					   ${otherTopicsArray},
					   ${event.blockNumber},
					   '${event.data}',
					   '${event.address}',
					   ${event.logIndex}
					   )`;
      })
      .join(',');

    return this.insertTransactionValues(eventsValuesStr, eventsTable);
  }

  getBlockInfoSqlString(
    fromHex: string,
    toHex: string,
    infoFunction,
    blockInfoTable: string,
    length?: number,
  ): string {
    const fromNum = Web3.utils.toDecimal(fromHex);
    const toNum = Web3.utils.toDecimal(toHex);

    const info = length ? infoFunction(length) : infoFunction(fromNum, toNum);
    const blockInfoValuesStr = `(${fromNum},${toNum},'${info}','${new Date().toUTCString()}')`;
    this.logger.log(`BlockInfo value - ${blockInfoValuesStr}`);
    return this.insertTransactionValues(blockInfoValuesStr, blockInfoTable);
  }

  insertTransactionValues(values: string, field: string): string {
    if (!values) {
      return;
    }

    let insertQueryStart: string;
    switch (field) {
      case ETH_BLOCKS:
      case BSC_BLOCKS:
        return `insert into ${field} (number, timestamp, hash) values ${values} 
            on conflict(number) 
            do update set 
            timestamp = EXCLUDED.timestamp, 
            hash = EXCLUDED.hash`;
      case BLOCKS_INFO:
      case BSC_BLOCKS_INFO:
        insertQueryStart = `insert into ${field} (from_block, to_block, information, created_at) values `;
        break;
      case ETH_TRANSACTIONS:
      case BSC_TRANSACTIONS:
        return `insert into ${field} (hash, block_number, "from", "to", input, value, gas, gas_price, index) values ${values} 
            on conflict(hash) 
            do update set 
            block_number = EXCLUDED.block_number, 
            "from" = EXCLUDED."from", 
            "to" = EXCLUDED."to", 
            input = EXCLUDED.input, 
            value = EXCLUDED.value, 
            gas = EXCLUDED.gas, 
            gas_price = EXCLUDED.gas_price,
            index = EXCLUDED.index`;
      case ETH_EVENTS:
      case BSC_EVENTS:
        insertQueryStart = `insert into ${field} (transaction_hash, topic_1, topic_2, topic_3, topics, block_number, data, address, log_index) values `;
        break;
    }
    return insertQueryStart.concat(values);
  }

  getBlockInfoSelectString(field: string): string {
    return `select to_block from ${field} order by to_block desc limit 1`;
  }

  getEthBlockSelectString(field: string): string {
    return `select "number" from ${field} order by number desc limit 1`;
  }
}
