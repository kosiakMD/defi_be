import { Logger } from '../Logger/Logger.service';
import { toTimestamp } from '../utils/common';
import { TOKEN_START_DATE, SECONDS_IN_DAY } from '../utils/constants';

export async function crawlCoin(
  coinId,
  coin,
  prices,
  currencyId,
  db,
  logger: Logger,
  platform: string,
  isRoundingNeeded = true,
) {
  if (!coin.address) {
    logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }

  logger.log(`${platform} ${prices.length} prices found for history token `, coinId);
  if (prices.length) {
    const tokenPrices = prices.map(([timestamp, price]) => ({
      id: coin.id,
      address: coin.address,
      timestamp: isRoundingNeeded ? Math.round(timestamp / 1000) : timestamp,
      price: price,
      currencyId,
    }));

    return await db.saveTokenPrices(coinId, tokenPrices);
  }
  return true;
}

export async function crawlCoinHistory(
  coinId,
  coin,
  prices,
  currencyId,
  db,
  logger: Logger,
  platform: string,
  isRoundingNeeded = true,
  firstTimestamp = null,
  lastTimestamp = null,
) {
  if (!coin.address) {
    //logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }

  //logger.log(`${platform} ${prices.length} prices found for history token `,coinId);
  if (prices.length) {
    const tokenPrices = [],
      haveTimestamps = [];

    prices.map(([timestamp, price]) => {
      const dayTs =
        (isRoundingNeeded ? Math.round(timestamp / 1000) : timestamp) -
        ((isRoundingNeeded ? Math.round(timestamp / 1000) : timestamp) % SECONDS_IN_DAY);

      if (haveTimestamps.indexOf(dayTs) < 0 && dayTs !== firstTimestamp) {
        tokenPrices.push({
          id: coin.id,
          address: coin.address,
          timestamp: dayTs,
          price: price,
          currencyId,
        });
        haveTimestamps.push(dayTs);
      }

      return;
    });

    if (lastTimestamp) {
      await db.updateAssetHistoryTimestamp(coin.id, lastTimestamp);
    }

    // logger.log("got new history prices ");
    //logger.log(tokenPrices);
    return await db.saveTokenPrices(coinId, tokenPrices);
  }

  if (lastTimestamp) {
    await db.updateAssetHistoryTimestamp(coin.id, lastTimestamp);
  }
  logger.log('did not get any prices');
  return true;
}

export async function getRequiredHistoryStartDate(coin, lastTimestamp, db, logger: Logger) {
  if (!coin.address) {
    logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }
  let startTimestamp;
  // if no last_history_timestamp - parsing from 2013
  if (!coin['last_history_timestamp']) {
    await db.clearTokenPricesForPeriod(
      coin.id,
      toTimestamp(new Date(TOKEN_START_DATE)),
      lastTimestamp,
    );
    startTimestamp = toTimestamp(new Date(TOKEN_START_DATE));
    //logger.log("removing all");
    return toTimestamp(new Date(TOKEN_START_DATE));
  } else {
    startTimestamp = coin['last_history_timestamp'];
  }

  let tmpStartTimestamp = lastTimestamp;
  let prices: any[];
  //logger.log("checking asset " + coin.id);
  do {
    prices = await db.getTokenPricesForLastDay(coin.id, tmpStartTimestamp);
    // logger.log("got prices length for coin " + coin.address + " : " + prices.length + " for range " + (startTimestamp - SECONDS_IN_HOUR * 24) + ' - ' + startTimestamp);

    if (prices.length !== 1) {
      // clearing this day and checking next day
      if (prices.length > 1) await db.clearTokenPricesForLastDay(coin.id, tmpStartTimestamp);

      tmpStartTimestamp -= SECONDS_IN_DAY;
    }
  } while (prices.length > 1); // if prices.length = 1 - stop checking days and return start date

  if (startTimestamp > tmpStartTimestamp) startTimestamp = tmpStartTimestamp;

  return startTimestamp;
}
