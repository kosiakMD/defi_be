import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';

import { Injectable } from '@nestjs/common';

import { BalancesResponse, ChainIdEnum } from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { Asset } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';

@Injectable()
export class CardanoService {
  constructor(
    private readonly priceService: PriceService,
    private readonly accountService: AccountService,
  ) {}

  mapTokens(poolPosition: LiquidityPoolFeature): PoolTokenDto[] {
    return poolPosition.tokens.map((token) => {
      token.balance = token.reserve * poolPosition.stats.share;
      token.value = token.balance * token.price;

      delete token.totalSupply;
      delete token.tokens;
      delete token.weight;
      delete token.positionInPool;

      return token;
    });
  }

  getPoolAddressesAmount(
    addresses: string[],
    lpBalances: BalancesResponse,
    cache: string[],
  ): Map<string, [string, string][]> {
    const pools = new Map<string, [string, string][]>();
    const poolsMap = new Map<string, string>(
      cache.map((address) => [address.replace(/\./, ''), address]),
    );

    for (const address of addresses) {
      lpBalances[address].tokens.map(({ token, amount }) => {
        if (poolsMap.has(token.address)) {
          if (!pools.has(address)) {
            pools.set(address, []);
          }
          pools.get(address).push([poolsMap.get(token.address), amount]);
        }
      });
    }

    return pools;
  }

  async getTokenInfo(token: string): Promise<Asset & { price: number }> {
    const result = await Promise.all([
      this.priceService.getTokenPrices([token], ChainIdEnum.cardano),
      this.accountService.getAssets([token], [ChainIdEnum.cardano]),
    ]);

    const tokenPrice = result[0].prices[token];
    const tokenInfo = result[1].data[0];

    return { ...tokenInfo, price: tokenPrice };
  }

  calculatePoolShare(walletBalance: number, poolPosition: LiquidityPoolFeature): number {
    const totalSupply: number = poolPosition.lpToken.totalSupply;
    const balance = toDecimals(walletBalance, poolPosition.lpToken.decimals);

    return new BigNumber(balance / totalSupply).toNumber();
  }

  cleanUpItem(item: IntegrationStakingPositionDto) {
    delete item.staked;
    delete item.stats;
    delete item.extra;
    // fields from NotifyPools
    delete item['lpToken'];
    delete item['statistic'];
    delete item['tokens'];

    return item;
  }
}
