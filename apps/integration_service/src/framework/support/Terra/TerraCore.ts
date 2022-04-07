import { Cache } from 'cache-manager';

import { Logger } from '@app/common';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { RootProtocol } from '../RootProtocol';
import { IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';

export abstract class TerraCore<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
> extends RootProtocol<TMinimalType, TOpportunityType, TUserEntryType> {
  // Common Services (Injected)
  protected abstract logger: Logger;
  protected abstract cache: Cache;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;
}
