import { plainToClass } from 'class-transformer';

import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum, CurrencyIdEnum, Logger } from '@app/common';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { PriceRequestCurrentDto } from '../dto/PriceRequestCurrent.dto';

export abstract class ProtocolBase {
  chain: ChainIdEnum;

  protected readonly logger: Logger;
  protected readonly configService: ConfigService;
  protected readonly accountService: AccountService;
  protected readonly priceService: PriceService;

  fetchAssets(addresses: Address[]) {
    return this.accountService.getAssets(addresses, this.chain);
  }

  saveAssets(addresses: Address[]) {
    return Promise.allSettled(
      addresses.map((address) => this.accountService.saveTrackingAsset(address, this.chain)),
    );
  }

  fetchPrices(addresses: Address[]) {
    return this.priceService.getPrices(addresses, this.chain);
  }

  formatPriceRequest(address: Address, price: number): PriceRequestCurrentDto {
    return plainToClass(PriceRequestCurrentDto, {
      address,
      price,
      chainId: Number(this.chain),
      currencyId: CurrencyIdEnum.usd,
    } as PriceRequestCurrentDto);
  }
}
