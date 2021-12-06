import { getManager } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum, CurrencyIdEnum } from '@app/common';

import { PriceRequestCurrentDto } from './dto';

@Injectable()
export class PriceRepository {
  async savePriceAssets(sqlValues: string) {
    return await getManager().query(
      `INSERT INTO prices.asset(address, chain_id) VALUES ${sqlValues} RETURNING *`,
    );
  }

  async saveCurrentPrices(sqlValues: string) {
    return await getManager().query(`
      INSERT INTO prices.asset_current_price(asset_id, currency_id, value, source_id, updated_at)
      VALUES ${sqlValues}
      ON CONFLICT (asset_id) 
      DO UPDATE SET value=EXCLUDED.value, source_id=EXCLUDED.source_id, updated_at=NOW()
      RETURNING *`);
  }

  async getAllCurrentPrices() {
    return await getManager().query(`
      SELECT a.address, a.chain_id, ap.value, ap.source_id, ap.updated_at
          FROM prices.asset a 
          JOIN prices.asset_current_price ap 
            ON a.id = ap.asset_id
            `);
  }

  async getCurrentPricesByAddressesAndChain(addresses: string[], chain: ChainIdEnum) {
    return await getManager().query(`
        SELECT a.address, ap.value
        FROM prices.asset a
        LEFT JOIN prices.asset_current_price ap
          ON a.id = ap.asset_id
        WHERE
          a.address IN ('${addresses.join("','")}') AND
          a.chain_id = ${chain} AND
          ap.updated_at >= (NOW() - INTERVAL '1 DAY')
        ORDER BY ap.asset_id
      `);
  }

  async getCurrentPricesByAddressesChainAndCurrency(
    addresses: string[],
    chain: ChainIdEnum,
    currencyId: CurrencyIdEnum,
  ) {
    return await getManager().query(`
        SELECT a.address, ap.timestamp, ap.value
        FROM prices.asset a
        JOIN prices.asset_price ap
          ON a.id = ap.asset_id
        WHERE
          a.address IN ('${addresses.join("','")}') AND
          a.chain_id = ${chain} AND
          ap.currency_id = ${currencyId}
        ORDER BY ap.asset_id, ap.timestamp
    `);
  }

  async findAssetsByAddressesAndChains(sqlCondition: string) {
    return await getManager().query(`SELECT * FROM prices.asset WHERE ${sqlCondition}`);
  }

  getFindAssetsSqlCondition(requestBody: PriceRequestCurrentDto[]): string {
    return requestBody.reduce<string>(
      (result: string, dto: PriceRequestCurrentDto, i: number) =>
        result +
        `(address='${dto.address}' AND chain_id=${dto.chainId})` +
        (i !== requestBody.length - 1 ? ' OR ' : ''),
      '',
    );
  }

  getSqlValues(listOfObjects: any[], getValues): string {
    return listOfObjects.reduce<string>(
      (result: string, sourceObject: any, i: number) =>
        result + getValues(sourceObject) + (i !== listOfObjects.length - 1 ? ',' : ''),
      '',
    );
  }
}
