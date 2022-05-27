import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { Logger } from '@app/common';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { RootProtocolCacheable } from '../RootProtocolCacheable';
import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';

export abstract class CardanoCore<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta = IProtocolMeta,
> extends RootProtocolCacheable<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  // Common Services (Injected)
  protected abstract logger: Logger;
  protected abstract cache: Cache;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;
  protected abstract httpService: HttpService;
  protected abstract configService: ConfigService;
}
