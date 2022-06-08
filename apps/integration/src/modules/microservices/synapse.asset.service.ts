import { AccountService } from './account.service';
import { FakeAssetService } from './fake.asset.service';
import { PriceService } from './price.service';
import { SynapseStrategy } from './strategies/synapse.asset.strategy';

export class SynapseAssetService extends FakeAssetService {
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected dataStrategy: SynapseStrategy,
  ) {
    super(accountService, priceService);
  }
}
