import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';

@Injectable()
export class PoolsFeatureProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
  ) {}

  /*
    chainId,
    lpTokensInfo: [{
      lpTokenAddress,
      totalSupply,
      getReserves: {
        _reserve0,
        _reserve1,
      }
    }]
   */
  async process(chainId, lpTokensInfo) {
    //get trackedAssets info for each lpToken
    const promises = [];
    lpTokensInfo.forEach((info) =>
      promises.push(this.accountService.getTrackedAssets(info.lpTokenAddress, chainId)),
    );
    const extendedLpTokenInfo = [];
    const tokenAddresses: Address[] = [];
    const promisesExecuted = await Promise.allSettled(promises);
    promisesExecuted.forEach((p, i) => {
      if (p.status === 'fulfilled') {
        extendedLpTokenInfo.push({
          ...lpTokensInfo[i],
          trackedAssets: p.value,
        });
        p.value.underlyingAssets.forEach((asset) => {
          tokenAddresses.push(asset.address);
        });
      } else {
        this.logger.error(`accountService.getTrackedAssets error: [${p.reason}]`);
      }
    });

    //get prices for all tokens
    const { prices } = await this.priceService.getTokenPricesFetch(tokenAddresses, chainId);
    console.log('================================================================')
    console.log({ prices });
    console.log('================================================================')

    //todo add calculation logic here
  }
}
