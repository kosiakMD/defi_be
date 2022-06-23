import { Injectable } from '@nestjs/common';

import { AccountService } from './account.service';
import { PriceService } from './price.service';
import { SpiritSwapStrategy } from './strategies/spiritSwap.asset.strategy';
import { UniswapV2AssetService } from './uniswap.asset.service';

@Injectable()
export class SpiritSwapAssetService extends UniswapV2AssetService {
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected dataStrategy: SpiritSwapStrategy,
  ) {
    super(accountService, priceService, dataStrategy);
  }
}
