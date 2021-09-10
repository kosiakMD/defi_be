import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getManager } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

import { Logger } from '../../Logger/Logger.service';
import { AssetsEntity } from '../../assets/entity/assets.entity';
import { TransferEntity, TransferEntityNew } from '../dto/transfers.entity';
import { TransferFromDb } from '../interfaces/transfers.interfaces';
import { TransfersRepository } from './transfers.repository';

const DEFAULT_LIMIT = 10e3;

@Injectable()
export class DbService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(TransferEntityNew) private readonly transfersRepository: TransfersRepository,
  ) {}

  async getTransfersDataFromDb(
    addresses: Address[],
    chainId: ChainIdEnum,
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

      // doesn't transform properties
      // const transfers: TransferEntity[] = this.transfersRepository.create(dbTransfers);
      const transfers: TransferEntity[] = plainToClass(TransferEntity, dbTransfers);
      this.logger.debug(`transfers: ${transfers.length} chainId: ${chainId}`);

      return transfers;
    } catch (e) {
      this.logger.timeEnd(timeMark);
      this.logger.error(e, timeMark);
      throw e;
    }
  }

  async getAssetTransfers(asset: AssetsEntity, addresses: string[]): Promise<TransferEntityNew[]> {
    return this.transfersRepository
      .createQueryBuilder('transfers')
      .where(
        'transfers.assetId = :assetId and (transfers.from in (:...addresses) or transfers.to in (:...addresses))',
        {
          assetId: asset.id,
          addresses: addresses,
        },
      )
      .limit(DEFAULT_LIMIT)
      .getMany();
  }

  private queryRaw(
    addressesString: string,
    chainId: ChainIdEnum,
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
           assets_new.decimals AS "tokenDecimals",
           assets_new.is_analytic_available as "isIncludedToGraph"
        FROM (
             SELECT fromAddress AS "fromAddress",
                    toAddress AS "toAddress",
                    tx_hash AS "hash",
                    timestamp AS "blockTimeStamp",
                    amount AS "amount",
                    asset_id AS assetId
             FROM (
                  SELECT "from" AS fromAddress,
                         asset_id, VALUE AS amount,
                         "to" AS toAddress,
                         "tx_hash" AS "tx_hash",
                         "timestamp" AS "timestamp"
                  FROM asset_transfers_new
                  WHERE "from" IN (${addressesString})
                  UNION ALL
                  SELECT "from" AS fromAddress,
                         asset_id, VALUE AS amount,
                         "to" AS toAddress,
                         "tx_hash" AS "tx_hash",
                         "timestamp" AS "timestamp"
                  FROM asset_transfers_new
                  WHERE "to" IN (${addressesString})
             ) AS reduced
        ) AS balances
        JOIN assets_new ON assetId = assets_new.id
        WHERE assets_new.chain_id = ${chainId}
        LIMIT ${limit}
    `;
    return manager.query(stringQuery);
  }
}
