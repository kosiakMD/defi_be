import { HttpService, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { getManager } from 'typeorm';

import {
  WETH_ADDRESS,
  CHAIN_ID_ETH,
  ETH_BNB_ADDRESS} from '../../utils/utils';
import { CurrentPricesPayload, PriceResponseDto } from '../dto/price.response.dto';
import { TokenRow } from '../interfaces/balance.interfaces';

@Injectable()
export class DbService {
  constructor(private readonly httpService: HttpService) {}

  async getTokenPrices(
    addresses: string[],
    chainId: number,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {

    if (chainId === CHAIN_ID_ETH) {
      addresses.push(WETH_ADDRESS.toLowerCase())
    }
    addresses.push(ETH_BNB_ADDRESS.toLowerCase());

    const tokenAddresses = await addresses.join(',');

    return this.httpService
      .get<PriceResponseDto<CurrentPricesPayload>>(
        `https://price.dfyield.xyz/v1/prices?chain=${chainId}&addresses=${tokenAddresses}`,
      )
      .pipe(map((response) => response.data))
      .toPromise()
      .catch(() => {
        const pricePayload: CurrentPricesPayload = {};

        addresses.forEach((item) => {
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
