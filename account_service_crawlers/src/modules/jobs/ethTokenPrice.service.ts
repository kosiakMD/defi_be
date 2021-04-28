import { Inject, Injectable, LoggerService, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';
import { getManager } from 'typeorm';

import { PriceServiceResponse } from '../../models/interfaces/priceServiceResponse.interface';
import getLastTransactionId from '../../models/queries/GET_LAST_TRANSACTION_ID';
import getUnPricedTokens from '../../models/queries/GET_UPRICED_TRANSACTIONS';
import updateTokenEthPrices from '../../models/queries/UPDATE_TOKEN_ETH_PRICES';
import updateTokenUsdPrices from '../../models/queries/UPDATE_TOKEN_USD_PRICES';

export type TokenAddresses = { [key: string]: number };

@Injectable()
export class EthTokenPriceService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  async getTokenPrices(
    unpricedTokens: Array<any>,
    timestamps: Array<any>,
  ): Promise<PriceServiceResponse> {
    return this.httpService
      .get(
        `${this.configService.get<string>(
          'PRICE_SERVICE_ENDPOINT',
        )}?currencyId=1&chainId=1&addresses=${unpricedTokens.toString()}&timestamps=${timestamps}`,
      )
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async updateEthUsdTokenPrices(entityManager, offset): Promise<void> {
    const ethAddress = this.configService.get<string>('PRICE_SERVICE_ETH_ADDRESS');
    try {
      this.logger.log(new Date().toLocaleTimeString(), 'getUnPricedTokens');
      const start1 = new Date().getTime();
      const unpricedTokens = await entityManager.query(getUnPricedTokens(offset));
      this.logger.log((new Date().getTime() - start1) / 1000, 'Query: getUnPricedTokens');

      const tokens = {
        addresses: [],
        timestamps: [],
      };
      for (const token of unpricedTokens) {
        if (!tokens.addresses.includes(token.tokenaddress)) {
          tokens.addresses.push(token.tokenaddress);
          tokens.timestamps.push(token.blocktimestamp);
        }
      }

      this.logger.log(new Date().toLocaleTimeString(), 'Get: getTokenPrices & getTokenPrices');
      const start2 = new Date().getTime();
      const [tokenPrices, ethPrice] = await Promise.all([
        this.getTokenPrices(tokens.addresses, tokens.timestamps),
        this.getTokenPrices([ethAddress], tokens.timestamps),
      ]);
      this.logger.log(
        (new Date().getTime() - start2) / 1000,
        'Get: getTokenPrices & getTokenPrices',
      );

      this.logger.log(new Date().toLocaleTimeString(), 'unpricedTokens.find');
      const usdPrices = [];
      const ethPrices = [];
      const pricesKeys = Object.keys(tokenPrices.prices);
      const start3 = new Date().getTime();
      for (const token of pricesKeys) {
        if (tokenPrices.prices[token] !== null) {
          const txTimestamp = await unpricedTokens.find((upricedTx) => {
            // console.log('upricedTx.tokenaddress', upricedTx.tokenaddress);
            // console.log('token', token);
            // console.log('upricedTx.tokenaddress == token', upricedTx.tokenaddress == token);
            return upricedTx.tokenaddress == token;
          });
          const tokenPrice = tokenPrices.prices[token][txTimestamp.blocktimestamp];
          const ethPriceTimestamp = ethPrice.prices[ethAddress][txTimestamp.blocktimestamp];
          if (tokenPrice) {
            usdPrices.push(`('${token}',${tokenPrice})`);
          }
          if (ethPriceTimestamp) {
            ethPrices.push(`('${token}',${ethPriceTimestamp})`);
          }
        }
      }
      this.logger.log(
        (new Date().getTime() - start3) / 1000,
        `Query find: unpricedTokens of ${pricesKeys.length}`,
      );

      this.logger.log(
        new Date().toLocaleTimeString(),
        'Query: updateTokenUsdPrices & updateTokenEthPrices',
      );
      const start4 = new Date().getTime();
      await Promise.all([
        entityManager.query(updateTokenUsdPrices(usdPrices)),
        entityManager.query(updateTokenEthPrices(ethPrices)),
      ]);
      this.logger.log(
        (new Date().getTime() - start4) / 1000,
        'Query: updateTokenUsdPrices & updateTokenEthPrices',
      );
    } catch (e) {
      this.logger.error(e, 'Token price update error');
    }
  }

  public async updateTokenPrices(): Promise<void> {
    let offset;
    const entityManager = getManager();

    // const ids = await entityManager.query(`SELECT * FROM transactions LIMIT 100`);
    // this.logger.log(ids, 'ids');

    this.logger.log(new Date().toLocaleTimeString(), 'getLastTransactionId');
    const start = new Date().getTime();
    const lastTransactionId = await entityManager.query(getLastTransactionId());
    this.logger.log((new Date().getTime() - start) / 1000, 'Query: getLastTransactionId');

    this.logger.log(lastTransactionId, 'lastTransactionId');
    this.logger.log(lastTransactionId[0], 'lastTransactionId');
    this.logger.log(lastTransactionId[0].id, 'lastTransactionId');

    for (offset = 0; offset < Number(lastTransactionId[0].id); offset = offset + 500) {
      this.logger.log(offset, 'offset');

      this.logger.log(new Date().toLocaleTimeString(), 'updateEthUsdTokenPrices');
      const start = new Date().getTime();
      await this.updateEthUsdTokenPrices(entityManager, offset);
      this.logger.log((new Date().getTime() - start) / 1000, 'Query: updateEthUsdTokenPrices');
    }
  }
}
