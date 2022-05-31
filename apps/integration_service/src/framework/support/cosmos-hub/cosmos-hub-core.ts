import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';

import { Logger } from '@app/common';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';
import { RootProtocolCacheable } from '../root-protocol-cacheable';

export abstract class CosmosHubCore<
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
}
