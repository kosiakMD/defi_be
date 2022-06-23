import { Injectable } from '@nestjs/common';

import { AccountService } from './account.service';
import { PriceService } from './price.service';
import { IronFinanceStrategy } from './strategies/ironFinance.asset.strategy';
import { UniswapV2AssetService } from './uniswap.asset.service';

@Injectable()
export class IronFinanceAssetService extends UniswapV2AssetService {
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected dataStrategy: IronFinanceStrategy,
  ) {
    super(accountService, priceService, dataStrategy);
  }
}
