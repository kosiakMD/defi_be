import { LoggerService } from '@nestjs/common';
import { SECONDS_IN_HOUR, TOKEN_START_DATE } from '../utils/constants';
import { toTimestamp } from '../utils/common';

export async function crawlCoin(
  coinId,
  coin,
  prices,
  currencyId,
  db,
  logger: LoggerService,
  platform: string,
  isRoundingNeeded = true
) {
  if (!coin.address) {
    logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }

  logger.log(`${platform} ${prices.length} prices found for history token `,coinId);
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
  logger: LoggerService,
  platform: string,
  isRoundingNeeded = true,
  lastTimestamp = null
) {
  if (!coin.address) {
    logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }

  logger.log(`${platform} ${prices.length} prices found for history token `,coinId);
  if (prices.length) {
    const tokenPrices = [],
    haveTimestamps = [];
    
    prices.map(([timestamp, price]) => {
      const dayTs = (isRoundingNeeded ? Math.round(timestamp / 1000) : timestamp) - ((isRoundingNeeded ? Math.round(timestamp / 1000) : timestamp)  % 86400 );
       
      if(haveTimestamps.indexOf(dayTs) < 0) {
        tokenPrices.push({
          id: coin.id,
          address: coin.address,
          timestamp: dayTs,
          price: price,
          currencyId,
        })
        haveTimestamps.push(dayTs)
       }

       return;
     }
    );
    
    if(lastTimestamp) {
      await  db.updateAssetHistoryTimestamp(coin.id, lastTimestamp);
    }

    logger.log("got new history prices ");
    logger.log(tokenPrices);
    return await db.saveTokenPrices(coinId, tokenPrices);
  }
  
  if (lastTimestamp) {
    await  db.updateAssetHistoryTimestamp(coin.id, lastTimestamp);
  }
  logger.log("did not get any prices");
  return true;
}

export async function getRequiredHistoryStartDate(
  coin,
  lastTimestamp,
  db,
  logger: LoggerService
) {
  if (!coin.address) {
    logger.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }
  // if no last_history_timestamp - parsing from 2013
  if (!coin['last_history_timestamp']) {
    await db.clearTokenPricesForPeriod(coin.id, toTimestamp(new Date(TOKEN_START_DATE)), lastTimestamp);
    logger.log("removing all");
    return toTimestamp(new Date(TOKEN_START_DATE));
  }
  let startTimestamp = lastTimestamp;
  let prices: any[];
  logger.log("checking asset " + coin.id);
  do {
    prices = await  db.getTokenPricesForLastDay(coin.id, startTimestamp);
    logger.log("got prices length for coin " + coin.address + " : " + prices.length + " for range " + (startTimestamp - SECONDS_IN_HOUR * 24) + ' - ' + startTimestamp);
    if (!prices.length) {
      await db.setTokenIsDead(coin.id);
    }
    
    if (prices.length > 1) { // clearing this day and checking next day
      await db.clearTokenPricesForLastDay(coin.id, startTimestamp);
      startTimestamp -= SECONDS_IN_HOUR * 24;
    }
    logger.log("prices.length ");
    logger.log(prices.length);
  } // if prices.length = 1 - stop checking days and return start date
  while(prices.length > 1);
  
  return startTimestamp;
 
}


