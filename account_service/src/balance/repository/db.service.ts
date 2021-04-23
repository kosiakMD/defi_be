import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';
import { getManager } from 'typeorm';

import { WETH_ADDRESS, CHAIN_ID_ETH, ETH_BNB_ADDRESS } from '../../utils/utils';
import { CurrentPricesPayload, PriceResponseDto } from '../dto/price.response.dto';
import { TokenRow } from '../interfaces/balance.interfaces';

@Injectable()
export class DbService {
  private readonly getPricesUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;
    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
  }

  async getTokenPrices(
    addressesArray: string[],
    chain: number,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    if (chain === CHAIN_ID_ETH) {
      addressesArray.push(WETH_ADDRESS.toLowerCase());
    }
    addressesArray.push(ETH_BNB_ADDRESS.toLowerCase());

    const addresses = await addressesArray.join(',');

    return this.httpService
      .get<PriceResponseDto<CurrentPricesPayload>>(this.getPricesUrl, {
        params: {
          chain,
          addresses,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise()
      .catch(() => {
        const pricePayload: CurrentPricesPayload = {};

        addressesArray.forEach((item) => {
          pricePayload[`${item}`] = 0;
        });
        return { chain: undefined, currency: undefined, prices: pricePayload };
      });
  }

  public loadErc20Balances = (accounts: string[], chainId: number): Promise<TokenRow[]> => {
    const [transactionTable, tokenTable] =
      chainId == 1 ? ['transactions', 'token'] : ['bsc_transfers', 'bsc_token'];

    const manager = getManager();
    // NOTE: We join addresses as there seems to be no better way to do IN query
    // We are safe with query building as parameters are validated before
    const addresses = accounts.map((accounts) => `'${accounts}'`).join(',');

    return manager.query(`
      select balances.*,
        ${tokenTable}.name as "tokenName",
        ${tokenTable}.symbol as "tokenSymbol",
        ${tokenTable}.decimals as "tokenDecimals",
        ${tokenTable}."totalSupply" as "tokenTotalSupply"
      from (
        select
          address,
          "tokenAddress",
          sum(amount) as "amount"
        from (
          select "fromAddress" as address, "tokenAddress", -sum(amount) as amount
          from ${transactionTable}
          where "fromAddress" in (${addresses})
          group by "fromAddress", "tokenAddress"

          union all

          select "toAddress" as address, "tokenAddress", sum(amount) as amount
          from ${transactionTable}
          where "toAddress" in (${addresses})
          group by "toAddress", "tokenAddress"
        ) as reduced
      group by address, "tokenAddress") as balances
      join ${tokenTable} on "tokenAddress" = ${tokenTable}."address"
      where amount > 0
    `);
  };
}

// return this.httpService
//     .get<PriceResponseDto<CurrentPricesPayload>>(
//         `https://price.dfyield.xyz/v1/prices?chain=${chain}&addresses=${addresses}`,
//     )
//     .pipe(map((response) => response.data))
//     .toPromise()
//     .catch(() => {
//       const pricePayload: CurrentPricesPayload = {};
//
//       addressesArray.forEach((item) => {
//         pricePayload[`${item}`] = 0;
//       });
//       return { chain: undefined, currency: undefined, prices: pricePayload };
//     });
// }
