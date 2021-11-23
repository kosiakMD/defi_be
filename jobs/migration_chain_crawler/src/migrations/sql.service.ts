import Web3 from 'web3';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { BLOCKS_INFO, BSC_BLOCKS, BSC_BLOCKS_INFO, ETH_BLOCKS } from '../utils/utils';
import { MigrationBlockResponse } from './interfaces/migration.block.response';
import { BlockTransactionObject } from './interfaces/web3.interfaces';

@Injectable()
export class SqlService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  getBlocksAndTransactionsSqlStrings(
    blockResponse: BlockTransactionObject[],
    blocksTable: string,
  ): MigrationBlockResponse {
    const blockSqlArray = [];

    blockResponse.forEach((block) => {
      blockSqlArray.push(`(
        ${block.number},
        '${block.timestamp}',
        '${block.hash}')`);
    });

    this.logger.log('BLOCKS length ----> ' + blockSqlArray.length);

    const blocksString = blockSqlArray.join(',');
    const blocksInsertSql = this.insertValues(blocksString, blocksTable);

    return { blocksInsertSql };
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
    return this.insertValues(blockInfoValuesStr, blockInfoTable);
  }

  insertValues(values: string, field: string): string {
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
