import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getManager } from 'typeorm';

import { Inject, Injectable, LoggerService } from '@nestjs/common';

import { ETH_ADDRESS } from '../utils/util';
import { CoingeckoService } from './coingecko.service';
import { Network, networks } from './network.util';
import {
  Coin,
  CoinGeckoSimplePrice,
  CoinMarketCapData,
  CoinMarketCapResponse,
} from './temporary.tokens.interfaces';

@Injectable()
export class TemporaryTokensService {
  constructor(
    private coingeckoService: CoingeckoService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  async getTemporaryTokens(): Promise<string> {
    try {
      const coinMarketCapResponse: CoinMarketCapResponse = await this.coingeckoService.getCoinsListFromCoinMarketCap();
      const coinsList: Coin[] = await this.coingeckoService.getCoinsList();
      const ethCoinMarketCap: CoinMarketCapData[] = this.getFilteredEthCoins(
        coinsList,
        coinMarketCapResponse,
      );

      const coinGeckoSimplePricesArray: CoinGeckoSimplePrice[] = await Promise.all(
        this.getPricePromiseArray(ethCoinMarketCap),
      );

      const pricesMap = new Map<string, number>();
      coinGeckoSimplePricesArray.forEach((obj) => {
        for (const key in obj) {
          pricesMap.set(key, obj[key].usd);
        }
      });

      const tokensSqlStr = TemporaryTokensService.getSqlTokensValues(pricesMap, ethCoinMarketCap);
      await this.saveTemporaryTokensToDb(tokensSqlStr);
    } catch (e) {
      this.logger.error(e, 'getTemporaryTokens');
      throw Error(e);
    }
    return 'Tokens was added successfully to DB';
  }

  private getPricePromiseArray(
    ethCoinMarketCap: CoinMarketCapData[],
  ): Promise<CoinGeckoSimplePrice>[] {
    const pricePromisesArray: Promise<CoinGeckoSimplePrice>[] = [];
    for (let i = 0; i < ethCoinMarketCap.length; i += 100) {
      const sliceTo = i + 100 > ethCoinMarketCap.length ? ethCoinMarketCap.length : i + 100;
      const idsString = ethCoinMarketCap
        .slice(i, sliceTo)
        .map((coin) => {
          if (coin?.coinGeckoId) {
            return coin.coinGeckoId;
          }
        })
        .join(',');
      pricePromisesArray.push(this.coingeckoService.getCoinsPricesUsd(idsString));
    }
    return pricePromisesArray;
  }

  private async saveTemporaryTokensToDb(tokensSqlStr: string): Promise<void> {
    await getManager().transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.query(tokensSqlStr);
    });
  }

  private getFilteredEthCoins(
    coinsList: Coin[],
    coinMarketCapResponse: CoinMarketCapResponse,
  ): CoinMarketCapData[] {
    return coinMarketCapResponse.data.filter((coin) => {
      if (
        coin.name === networks[Network.ETHEREUM].name ||
        (coin.platform?.name &&
          coin.platform.name === networks[Network.ETHEREUM].name &&
          coin.platform.token_address)
      ) {
        const coinGeckoCoin = coinsList.find(
          (item) => item.symbol.toLowerCase() === coin.symbol.toLowerCase(),
        );
        if (coinGeckoCoin) {
          coin.coinGeckoId = coinGeckoCoin.id;
          return true;
        }
      }
      return false;
    });
  }

  private static getSqlTokensValues(
    pricesMap: Map<string, number>,
    ethCoinMarketCap: CoinMarketCapData[],
  ): string {
    const sqlValuesArray = [];
    ethCoinMarketCap.forEach((coin) => {
      if (pricesMap.has(coin.coinGeckoId) && pricesMap.get(coin.coinGeckoId)) {
        sqlValuesArray.push(`('${!coin.platform ? ETH_ADDRESS : coin.platform.token_address}',
            ${coin.rank},${pricesMap.get(coin.coinGeckoId)},
            '${coin.name.replace("'", "''")}','${coin.symbol}','${
          networks[Network.ETHEREUM].symbol
        }')`);
      }
    });

    const insertStr = `INSERT INTO temporary_tokens_new (address, rank, price_usd, name, symbol, network) VALUES `;
    const sqlValuesStr = sqlValuesArray.join(',');
    if (!sqlValuesStr) {
      return;
    }
    return insertStr.concat(sqlValuesStr);
  }
}
