import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Brackets, getManager } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';

import { Logger } from '../../Logger/Logger.service';
import { Address } from '../../common/interfaces';
import { ChainId } from '../../common/types';
import { TransferEntity, TransferTokenEntity } from '../dto/transfers.entity';
import { TransferFromDb } from '../interfaces/transfers.interfaces';
import { TransfersRepository } from './transfers.repository';

const DEFAULT_LIMIT = 10e3;

@Injectable()
export class DbService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(TransferEntity) private readonly transfersRepository: TransfersRepository,
  ) {}

  async getTransfersDataFromDb(
    addresses: Address[],
    chainId: ChainId,
    limit = DEFAULT_LIMIT,
  ): Promise<TransferEntity[]> {
    const timeMark = `getTransfersDataFromDb chain:${chainId}`;
    try {
      const addressesString = addresses.map((address) => `'${address}'`).join(',');
      // const query = this.getQuery(addressesString, chainId, limit);

      this.logger.time(timeMark);
      // TODO: refactor to Entity ready return
      // const dbTransfers = await query.getMany();
      // const dbTransfers = await query.getRawMany<TransferFromDb>();
      const dbTransfers = await this.queryRaw(addressesString, chainId, limit);
      this.logger.timeEnd(timeMark);
      // console.log('dbTransfers', dbTransfers);

      // doesn't transform properties
      // const transfers: TransferEntity[] = this.transfersRepository.create(dbTransfers);
      const transfers: TransferEntity[] = plainToClass(TransferEntity, dbTransfers);
      this.logger.debug(`transfers: ${transfers.length} chainId: ${chainId}`);
      // console.log('transfers', transfers);

      return transfers;
    } catch (e) {
      this.logger.timeEnd(timeMark);
      this.logger.error(e, timeMark);
      throw e;
    }
  }

  private queryRaw(
    addressesString: string,
    chainId: ChainId,
    limit = DEFAULT_LIMIT,
  ): Promise<TransferFromDb[]> {
    const manager = getManager();

    // asset_transfers.tx_hash AS "hash",
    // asset_transfers.from AS "fromAddress",
    // asset_transfers.to AS "toAddress",
    // asset_transfers.timestamp AS "blockTimeStamp",
    // asset_transfers.value AS "amount",

    const stringQuery = `
        SELECT balances.*,
           assets_new.address  AS "tokenAddress",
           assets_new.name     AS "tokenName",
           assets_new.symbol   AS "tokenSymbol",
           assets_new.decimals AS "tokenDecimals"
        FROM (
             SELECT fromAddress AS "fromAddress",
                    toAddress AS "toAddress",
                    tx_hash AS "hash",
                    timestamp AS "blockTimeStamp",
                    amount AS "amount",
                    asset_id AS assetId
             FROM (
                  SELECT "from" AS fromAddress,
                         asset_id, -VALUE AS amount,
                         "to" AS toAddress,
                         "tx_hash" AS "tx_hash",
                         "timestamp" AS "timestamp"
                  FROM asset_transfers_new
                  WHERE "from" IN (${addressesString})
                  UNION ALL
                  SELECT "to" AS toAddress,
                         asset_id, VALUE AS amount,
                         "from" AS fromAddress,
                         "tx_hash" AS "tx_hash",
                         "timestamp" AS "timestamp"
                  FROM asset_transfers_new
                  WHERE "to" IN (${addressesString})
             ) AS reduced
        ) AS balances
        JOIN assets_new ON assetId = assets_new.id
        WHERE assets_new.is_migrated = true AND assets_new.chain_id = ${chainId}
        LIMIT ${limit}
    `;
    return manager.query(stringQuery);
  }

  getQuery(
    addressesString: string,
    chainId: ChainId,
    limit = DEFAULT_LIMIT,
  ): SelectQueryBuilder<TransferEntity> {
    this.logger.time('query');
    // TODO delete mapping and use Entity columns with @View
    const query: SelectQueryBuilder<TransferEntity> = this.transfersRepository
      .createQueryBuilder('tsf')
      .select('tsf.tx_hash', 'hash')
      .addSelect('tsf.from', 'fromAddress')
      .addSelect('tsf.to', 'toAddress')
      .addSelect('tsf.timestamp', 'blockTimeStamp')
      .addSelect('tsf.value', 'amount')
      .addSelect('asset.address', 'tokenAddress')
      .addSelect('asset.name', 'tokenName')
      .addSelect('asset.symbol', 'tokenSymbol')
      .addSelect('asset.decimals', 'tokenDecimals')
      // .leftJoin(AssetsEntity, 'asset', 'tsf.asset_id = asset.id')
      // .leftJoinAndSelect(AssetsEntity, 'asset', 'tsf.asset_id = asset.id')
      .leftJoinAndSelect(TransferTokenEntity, 'asset', 'tsf.asset_id = asset.id')
      .where(`asset.chain_id = ${chainId}`)
      .andWhere('asset.is_migrated = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where(`tsf.from IN (${addressesString})`).orWhere(`tsf.to IN (${addressesString})`);
        }),
      )
      .limit(limit);
    this.logger.timeEnd('query');
    return query;
  }

  getQueryOld(
    addressesString: string,
    chainId: ChainId,
    limit = DEFAULT_LIMIT,
  ): SelectQueryBuilder<TransferEntity> {
    this.logger.time('query');
    // TODO delete mapping and use Entity columns with @View
    const query: SelectQueryBuilder<TransferEntity> = this.transfersRepository
      .createQueryBuilder('tsf')
      .select('tsf.tx_hash', 'hash')
      .addSelect('tsf.from', 'fromAddress')
      .addSelect('tsf.to', 'toAddress')
      .addSelect('tsf.timestamp', 'blockTimeStamp')
      .addSelect('tsf.value', 'amount')
      .addSelect('asset.address', 'tokenAddress')
      .addSelect('asset.name', 'tokenName')
      .addSelect('asset.symbol', 'tokenSymbol')
      .addSelect('asset.decimals', 'tokenDecimals')
      // .leftJoin(AssetsEntity, 'asset', 'tsf.asset_id = asset.id')
      // .leftJoinAndSelect(AssetsEntity, 'asset', 'tsf.asset_id = asset.id')
      .leftJoinAndSelect(TransferTokenEntity, 'asset', 'tsf.asset_id = asset.id')
      .where(`asset.chain_id = ${chainId}`)
      .andWhere('asset.is_migrated = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where(`tsf.from IN (${addressesString})`).orWhere(`tsf.to IN (${addressesString})`);
        }),
      )
      .limit(limit);
    this.logger.timeEnd('query');
    return query;
  }

  /**
   * string literal query is faster: 0 ms / 0.01-0.06 ms by createQueryBuilder()
   * */
  getTransfersDataFromDbOld(
    addresses: Address[],
    chainId: ChainId,
    limit = DEFAULT_LIMIT,
  ): Promise<TransferEntity[]> {
    const addressesString = addresses.map((address) => `'${address}'`).join(',');
    const manager = getManager();

    // return await manager.query(`
    //   select
    //     asset_transfers.tx_hash AS hash,
    //     asset_transfers.from AS fromaddress,
    //     asset_transfers.to AS toaddress,
    //     asset_transfers.timestamp AS blocktimestamp,
    //     asset_transfers.value as amount,
    //     assets.address as assetaddress,
    //     assets.name AS tokenname,
    //     assets.symbol AS tokensymbol,
    //     assets.decimals AS tokendecimals
    //   from asset_transfers
    //   left join assets on asset_transfers.asset_id = assets.id
    //   where assets.chain_id = ${chainId}
    //     and assets.is_migrated = true
    //     and (
    //       asset_transfers.from IN (${addressesString})
    //         or asset_transfers.to IN (${addressesString})
    //       )
    //   order by asset_transfers.id DESC
    //   limit 10000
    // `);

    this.logger.time('stringQuery');
    const stringQuery = `
      SELECT
        asset_transfers.tx_hash AS "hash",
        asset_transfers.from AS "fromAddress",
        asset_transfers.to AS "toAddress",
        asset_transfers.timestamp AS "blockTimeStamp",
        asset_transfers.value AS "amount",
        assets.address AS "tokenAddress",
        assets.name AS "tokenName",
        assets.symbol AS "tokenSymbol",
        asset.decimals AS "tokenDecimals"
      FROM asset_transfers AS asset_transfers
      LEFT JOIN assets ON asset_transfers.asset_id = assets.id
      WHERE assets.chain_id = ${chainId}
        AND assets.is_migrated = true
        AND (
          asset_transfers.from IN (${addressesString})
            or asset_transfers.to IN (${addressesString})
          )
      ORDER BY asset_transfers.id DESC
      LIMIT ${limit}
    `;
    this.logger.timeEnd('stringQuery');

    // return this.transfersRepository.query(stringQuery);
    return manager.query(stringQuery);
  }
}
