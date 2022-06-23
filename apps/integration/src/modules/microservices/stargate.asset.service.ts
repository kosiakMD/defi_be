import { Injectable } from '@nestjs/common';

import { AccountService } from './account.service';
import { FakeAssetService } from './fake.asset.service';
import { PriceService } from './price.service';
import { StargateAssetStrategy } from './strategies/stargate.asset.strategy';

@Injectable()
export class StargateAssetService extends FakeAssetService {
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected dataStrategy: StargateAssetStrategy,
  ) {
    super(accountService, priceService);
  }
}
