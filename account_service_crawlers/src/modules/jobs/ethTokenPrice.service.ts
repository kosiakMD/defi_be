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
          'PRICE_SERIVCE_ENDPOINT',
        )}?currencyId=1&chainId=1&addresses=${unpricedTokens.toString()}&timestamps=${timestamps}`,
      )
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async updateEthUsdTokenPrices(entityManager, offset): Promise<void> {
    const ethAddress = this.configService.get<string>('PRICE_SERVICE_ETH_ADDRESS');
    try {
      const unpricedTokens = await entityManager.query(getUnPricedTokens(offset));

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
      const [tokenPrices, ethPrice] = await Promise.all([
        this.getTokenPrices(tokens.addresses, tokens.timestamps),
        this.getTokenPrices([ethAddress], tokens.timestamps),
      ]);

      const usdPrices = [];
      const ethPrices = [];
      for (const token of Object.keys(tokenPrices.prices)) {
        if (tokenPrices.prices[token] !== null) {
          const txTimestamp = await unpricedTokens.find(
            (upricedTx) => upricedTx.tokenaddress == token,
          );
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
      await Promise.all([
        entityManager.query(updateTokenUsdPrices(usdPrices)),
        entityManager.query(updateTokenEthPrices(ethPrices)),
      ]);
    } catch (e) {
      this.logger.error(e, 'Token price update error');
    }
  }

  public async updateTokenPrices(): Promise<void> {
    let offset;
    const entityManager = getManager();
    const lastTransactionId = await entityManager.query(getLastTransactionId());
    for (offset = 0; offset < Number(lastTransactionId[0].id); offset = offset + 500) {
      await this.updateEthUsdTokenPrices(entityManager, offset);
    }
  }
}
