import { plainToClass } from 'class-transformer';

import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum, CurrencyIdEnum, Logger } from '@app/common';
import { IPriceRequestCurrent } from '@app/common/interfaces/price.request.current';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { PriceRequestCurrentDto } from '../dto/PriceRequestCurrent.dto';
import { IProtocolPriceUpdate } from '../interfaces/protocol.price.update';

export abstract class ProtocolBase implements IProtocolPriceUpdate {
  chains: ChainIdEnum[]; // TODO: Fantom
  job: string;
  chain: ChainIdEnum;

  protected readonly logger: Logger;
  protected readonly configService: ConfigService;
  protected readonly accountService: AccountService;
  protected readonly priceService: PriceService;

  abstract update(): Promise<IPriceRequestCurrent[]>;

  fetchAssets(addresses: Address[]) {
    return this.accountService.getAssets(addresses, this.chain);
  }

  saveAssets(addresses: Address[], force = false) {
    return Promise.allSettled(
      addresses.map((address) => this.accountService.saveTrackingAsset(address, this.chain, force)),
    );
  }

  fetchPrices(addresses: Address[]) {
    return this.priceService.getPrices(addresses, this.chain);
  }

  async fetchPrice(address: Address) {
    const { prices } = await this.priceService.getPrices([address], this.chain);
    return Number(prices[address]);
  }

  formatPriceRequest(address: Address, price: number): PriceRequestCurrentDto {
    return plainToClass(PriceRequestCurrentDto, {
      address,
      price,
      chainId: Number(this.chain),
      currencyId: CurrencyIdEnum.usd,
    });
  }
}
