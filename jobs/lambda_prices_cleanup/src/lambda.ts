import pg from 'pg';

import { log, logError } from './utils/log';

async function handler(): Promise<void> {
  let client: pg.Client;

  try {
    log('Started');

    client = new pg.Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });

    await client.connect();

    // Delete not hourly prices
    const { rowCount } = await client.query(`
        DELETE
        FROM prices.asset_price
        WHERE timestamp % 3600 != 0;
    `);

    log(`Done. ${rowCount} rows removed`);
  } catch (e) {
    logError('Unhandled error occurred', e);
    throw e;
  } finally {
    await client?.end();
  }
}

export default handler;
