import { CurrentPricesPayload, PriceResponseDto } from 'apps/integration/src/common/dto';
import { MILK_REWARDS_TOKEN } from 'apps/integration/src/modules/protocols/helpers/cardano/cardano.constants';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { Address, ChainIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { hexToString } from '@app/common/utils';

import { PriceService } from './price.service';
import { PriceServiceInterface } from './price.service.interface';

@Injectable()
export class MuesliSwapPriceService implements PriceServiceInterface {
  constructor(private priceService: PriceService, private httpService: HttpService) {}

  async getTokenPricesFetch(
    addresses: string[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { prices } = await this.priceService.getTokenPricesFetch(
      [MILK_REWARDS_TOKEN, CARDANO_COIN_ADDRESS],
      chainId,
    );

    // Cast as number (return results are strings)
    prices['8a1cfae21368b8bebbbed9800fec304e95cce39a2a57dc35e2e3ebaa.4d494c4b'] = Number(
      prices[MILK_REWARDS_TOKEN],
    );
    prices[MILK_REWARDS_TOKEN] = Number(prices[MILK_REWARDS_TOKEN]);
    prices[CARDANO_COIN_ADDRESS] = Number(prices[CARDANO_COIN_ADDRESS]);

    const externalPrices = await Promise.allSettled(
      addresses.map((address) => this.fetchTokenPrice(address)),
    );

    externalPrices.forEach((priceResult) => {
      if (priceResult.status === 'fulfilled') {
        prices[priceResult.value.address] =
          priceResult.value.priceADA * prices[CARDANO_COIN_ADDRESS];
      }
    });

    return { prices };
  }

  private async fetchTokenPrice(address: Address): Promise<any> {
    const [policyId, hexName] = address.split('.');
    return await firstValueFrom(
      this.httpService
        .get(`https://orderbookv2.muesliswap.com/token-price`, {
          params: {
            'policy-id': policyId,
            tokenname: hexToString(hexName),
          },
        })
        .pipe(map(({ data }) => ({ address, priceADA: data.priceADA }))),
    );
  }
}
