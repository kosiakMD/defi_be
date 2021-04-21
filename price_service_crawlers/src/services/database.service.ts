/* eslint-disable camelcase*/
import { Inject, Injectable } from '@nestjs/common';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { toTimestamp } from '../utils/common';
import { CURRENCY, CHAIN, SECONDS_IN_HOUR, ETH_ADDRESS, BNB_CHAIN, BNB_ADDRESS } from '../utils/constants';

export type TokenPrices = { [key: string]: number };
export type TokenAddresses = { [key: string]: number };
export type TokenPricesExtended = { [key: string]: { value: number; ['db_id']: any } };

@Injectable()
export class DatabaseService {
  constructor(@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>) {}

  public getTokenByAddress = (address: string) =>
    this.pg.any('SELECT * FROM prices.asset WHERE address = $1', address);

  public getTokenPrice = (asset_id: string) =>
    this.pg.any(
      'SELECT * FROM prices.asset_price WHERE asset_id = $1 ORDER BY timestamp DESC LIMIT 1',
      asset_id,
    );

  public getAllTokens = () => this.pg.any('SELECT * FROM prices.asset WHERE $1', '1');

  public getSushiTokens = () =>
    this.pg.any('SELECT * FROM prices.asset WHERE platform = $1', 'SUSHISWAP');

  public getUniTokens = () =>
    this.pg.any('SELECT * FROM prices.asset WHERE platform = $1', 'UNISWAP');

  public getNewTokens = () => this.pg.any('SELECT * FROM prices.asset WHERE is_new = true');

  public getNewTokensByPlatform = (platform: string) =>
    this.pg.any(
      'SELECT * FROM prices.asset WHERE is_new = true AND platform = $1 AND is_dead = false',
      platform,
    );
  public getTokensByPlatformAndLastHistoryTimestamp = (
    platform: string,
    last_history_timestamp: number,
  ) =>
    this.pg.any(
      'SELECT * FROM prices.asset WHERE platform = $1 AND (last_history_timestamp < $2 OR last_history_timestamp IS NULL) AND is_dead = false',
      [platform, last_history_timestamp],
    );

  public getTokenPricesForLastDay = (assetId: number, timestamp: number) =>
    this.pg.any(
      'SELECT * FROM prices.asset_price WHERE asset_id = $1 AND timestamp >= $2 AND timestamp < $3',
      [assetId, timestamp - SECONDS_IN_HOUR * 24, timestamp],
    );

  public updateAssetHistoryTimestamp = (assetId: number, timestamp: number) =>
    this.pg.any('UPDATE prices.asset SET last_history_timestamp = $1 WHERE id = $2', [
      timestamp,
      assetId,
    ]);

  public setTokenIsDead = (assetId: number) =>
    this.pg.any('UPDATE prices.asset SET is_dead = true WHERE id = $1', [assetId]);

  public clearTokenPricesForPeriod = (
    assetId: number,
    timestampFrom: number,
    timestampTo: number,
  ) =>
    this.pg.any(
      'DELETE FROM prices.asset_price WHERE asset_id = $1 AND timestamp >= $2 AND timestamp < $3',
      [assetId, timestampFrom, timestampTo],
    );
  public clearTokenPricesForLastDay = (assetId: number, timestamp: number) =>
    this.pg.any(
      'DELETE FROM prices.asset_price WHERE asset_id = $1 AND timestamp >= $2 AND timestamp < $3',
      [assetId, timestamp - SECONDS_IN_HOUR * 24, timestamp],
    );
  public getTokensByChain = (currentChainId) =>
    this.pg.any('SELECT * FROM prices.asset WHERE chain_id = $1', currentChainId);

  public checkEthToken = async () => {
    const ethEntities = await this.pg.any('SELECT * FROM prices.asset WHERE address = $1', [
      ETH_ADDRESS,
    ]);
    if (!ethEntities.length) {
      const chainId = await this.getCurrentChain();
      await this.pg.any(
        'INSERT INTO prices.asset(address, symbol, name, type, platform, chain_id, is_new) VALUES ($1, $2, $3, $4, $5, $6, true); ',
        [ETH_ADDRESS, 'eth', 'ethereum', CHAIN, 'COINGECKO', chainId, true],
      );
    }
    return;
  };

  public checkBnbToken = async () => {
    const chainId = await this.getCurrentChain(BNB_CHAIN);

    const bnbEntities = await this.pg.any('SELECT * FROM prices.asset WHERE address = $1 AND chain_id = $2 ', [
      BNB_ADDRESS, chainId
    ]);

    if (!bnbEntities.length) {
      await this.pg.any(
        'INSERT INTO prices.asset(address, symbol, name, type, platform, chain_id, is_new) VALUES ($1, $2, $3, $4, $5, $6, true); ',
        [BNB_ADDRESS, 'bnb', 'binancecoin', BNB_CHAIN, 'COINGECKO', chainId, true],
      );
    }
    return;
  };

  public getTokensByChainAndPlatform = (currentChainId, platform, timestamp?) => {
    if (timestamp) {
      return this.pg.any(
        'SELECT * FROM prices.asset WHERE chain_id = $1 AND platform = $2 AND is_dead = false AND id not IN (SELECT asset_id FROM prices.asset_price WHERE timestamp = $3)',
        [currentChainId, platform, timestamp],
      );
    }

    return this.pg.any('SELECT * FROM prices.asset WHERE chain_id = $1 AND platform = $2', [
      currentChainId,
      platform,
    ]);
  };
  
  public getTokensByPlatform = ( platform, timestamp?) => {
    if (timestamp) {
      return this.pg.any(
        'SELECT * FROM prices.asset WHERE platform = $1 AND is_dead = false AND id not IN (SELECT asset_id FROM prices.asset_price WHERE timestamp = $2)',
        [ platform, timestamp],
      );
    }

    return this.pg.any('SELECT * FROM prices.asset WHERE platform = $1', [
      platform,
    ]);
  };

  public getLastTokenPriceByChainAndPlatform = (currentChainId, platform) => {
    return this.pg.any(
      'SELECT asset_id, max(timestamp) AS timestamp FROM prices.asset_price INNER JOIN prices.asset ON prices.asset.id = prices.asset_price.asset_id AND prices.asset.platform = $1 WHERE currency_id = $2 GROUP BY asset_id ORDER BY asset_id',
      [platform, currentChainId],
    );
  };

  public getLastTokenPriceByPlatform = (platform) => {
    return this.pg.any(
      'SELECT asset_id, max(timestamp) AS timestamp FROM prices.asset_price INNER JOIN prices.asset ON prices.asset.id = prices.asset_price.asset_id AND prices.asset.platform = $1 WHERE true GROUP BY asset_id ORDER BY asset_id',
      [platform],
    );
  };

  public removeToken = (assetId: number) => {
    return this.pg.any('UPDATE prices.asset SET is_dead = true WHERE id = $1', assetId);
  };

  public getCurrentChain = async (chainName = CHAIN) => {
    const platforms = await this.pg.any('SELECT * FROM prices.chain WHERE name = $1', chainName);
    if (!platforms.length) return null;
    return platforms[0].id;
  };

  public getCurrentCurrency = async () => {
    const curencies = await this.pg.any('SELECT * FROM prices.currency WHERE name = $1', CURRENCY);
    if (!curencies.length) return null;
    return curencies[0].id;
  };

  public addNewTokenToDb = (token: any, chainId, platform = 'COINGECKO') =>
    this.pg.any(
      'INSERT INTO prices.asset(address, symbol, name, type, chain_id, is_new, platform) VALUES ($1, $2, $3, $4, $5, true, $7); ',
      [token['platforms'][CHAIN], token['symbol'], token['name'], CHAIN, chainId, true, platform],
    );

  public addTokenToDb = async (address, name, symbol, type, platform, chainId) => {
    const new_one = await this.pg.any(
      'INSERT INTO prices.asset(address, symbol, name, type, platform, chain_id, is_new) VALUES ($1, $2, $3, $4, $5, $6, true); ',
      [address, symbol, name, type, platform, chainId, true],
    );

    return new_one;
  };

  public setAssetAsNotNew = async (coin_id) =>
    await this.pg.any('UPDATE prices.asset SET is_new = false WHERE id = $1;', [coin_id]);

  public addOnePrice = async (coin_id, timestamp, price, currency_id) =>
    await this.pg.any(
      'INSERT INTO prices.asset_price(asset_id, currency_id, "timestamp", value) VALUES ($1, $2, $3, $4);',
      [coin_id, currency_id, timestamp, price],
    );

  public saveTokenPrices = async (coin_id, prices) => {
    let values;
    try {
      values = prices
        .map(
          ({ id, timestamp, price, currencyId }) => `('${id}',${currencyId},${timestamp},${price})`,
        )
        .join(',');

      if (values) {
        try {
          await this.pg.any(
            'INSERT INTO prices.asset_price(asset_id, currency_id, "timestamp", value) VALUES ' +
              values +
              '',
          );
        } catch (e) {
          //console.log(dbErr);
        }
        await this.pg.any('UPDATE prices.asset SET is_new = false WHERE id = $1', coin_id + '');
      }

      return true;
    } catch (e) {
      return false;
    }
  };

  public addHourlyPricesToDb = async (
    prices: TokenPricesExtended,
    currencyId: any,
    currentTimestamp = null,
  ) => {
    if (!currentTimestamp)
      currentTimestamp = toTimestamp(new Date()) - (toTimestamp(new Date()) % SECONDS_IN_HOUR);

    try {
      for (const address in prices) {
        if (prices[address].db_id && (prices[address].value || prices[address]['value'] === 0)) {
          try {
            //console.log('inserting ' + address + ' price with ts ' + currentTimestamp);
            await this.pg.any(
              'INSERT INTO prices.asset_price(asset_id, currency_id, "timestamp", value) VALUES ($1, $2, $3, $4); ',
              [prices[address].db_id, currencyId, currentTimestamp, prices[address].value],
            );
          } catch (dbErr) {
            //console.log(dbErr);
            // console.info(
            //   `skipped unique pair as duplicate : asset_id-timestamp ${prices[address].db_id}-${currentTimestamp}`,
            // );
          }
        } else {
          //console.log('removing prices ', prices[address]);
          //console.log(prices);
          try {
            await this.removeToken(prices[address].db_id);
          } catch (dbErr) {
            //console.info(`can not set is_dead for asset: ${prices[address].db_id}`);
          }
          //console.log('some error with ', prices[address]);
        }
      }
    } catch (e) {
      //console.log(e);
    }
    return;
  };
}
