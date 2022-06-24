import { Injectable } from '@nestjs/common';

import { AccountService } from './account.service';
import { FakeAssetService } from './fake.asset.service';
import { PriceService } from './price.service';
import { UniswapV2LpStrategy } from './strategies/uniswap.v2.asset.strategy';

@Injectable()
export class UniswapV2AssetService extends FakeAssetService {
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected dataStrategy: UniswapV2LpStrategy,
  ) {
    super(accountService, priceService);
  }
}
