import { BigNumber as BN } from 'bignumber.js';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';

import { ChainIdEnum, CurrencyIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { PriceSourcePriority } from '@app/common/enum/price.enum';
import { stringToHex } from '@app/common/utils/string';

import { CurrentPriceInterface, PriceService } from '../price.service';
import { IToken, ITokenPrice } from './interfaces';

export class MuesliSwapService {
  private readonly overbookApi: string;
  private readonly httpService: HttpService;

  constructor() {
    this.overbookApi = 'https://orderbookv2.muesliswap.com';
    this.httpService = new HttpService();
  }

  async getPrices(): Promise<CurrentPriceInterface[]> {
    const tokens = new Map(
      (await this.fetchKnownTokens())
        .filter(({ scam }) => !scam)
        .map((token) => [this.toInternalAddress(token), token]),
    );
    const prices = await this.fetchTokensPrices();
    const adaPrice = (
      await PriceService.getAssetsPrice({
        chain: ChainIdEnum.cardano,
        addresses: CARDANO_COIN_ADDRESS,
      })
    ).prices[CARDANO_COIN_ADDRESS];

    return prices.map((tokenPrice) => this.toCurrentPrice(tokenPrice, tokens, adaPrice as number));
  }

  private toInternalAddress(token: IToken): string {
    return token.address.match(/(.{56})\.(.+)?/)[1] + stringToHex(token.name);
  }

  private toCurrentPrice(
    token: ITokenPrice,
    tokens: Map<string, IToken>,
    adaPrice: number,
  ): CurrentPriceInterface {
    return {
      // NOTE: 564a5265a77d07b5079fe41025362903f30272b49abc92d0bea425ea.737043 address to 564a5265a77d07b5079fe41025362903f30272b49abc92d0bea425ea737043
      address: token.tokenB.replace(/\./, ''),
      chainId: ChainIdEnum.cardano,
      currencyId: CurrencyIdEnum.usd,
      price: new BN(token.price_change_dict.priceADA) //
        .multipliedBy(10 ** (tokens.get(token.tokenB.replace(/\./, ''))?.decimalPlaces ?? 0))
        .multipliedBy(adaPrice)
        .toNumber(),
      sourceId: PriceSourcePriority.muesliswap,
    };
  }

  private fetchKnownTokens() {
    return firstValueFrom(
      this.httpService
        .get<IToken[]>(this.overbookApi + '/known-tokens')
        .pipe(map(({ data }) => data)),
    );
  }

  private fetchTokensPrices() {
    return firstValueFrom(
      this.httpService
        .get<ITokenPrice[]>(this.overbookApi + '/token-price')
        .pipe(map(({ data }) => data)),
    );
  }
}
