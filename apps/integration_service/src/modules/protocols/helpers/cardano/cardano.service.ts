import { Address } from '@emurgo/cardano-serialization-lib-nodejs';
import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';

import { Injectable } from '@nestjs/common';

import { BalancesResponse, ChainIdEnum } from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { Asset } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { BLAKE_224_LENGTH } from './cardano.constants';

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

  /**
   * @param address bech32 address format e.g. addr1q9dlxacm904nz7f3n35g3tf9pulg7kszvmj3296t3039p3l30aezwducj3k27k9ey7r6ndkttc7jnrdd6trs9jq57ccqa3l9g0
   * @returns hash of an address e.g. 015bf3771b2beb3179319c6888ad250f3e8f5a0266e515174b8be250c7f17f72273798946caf58b92787a9b6cb5e3d298dadd2c702c814f630
   */
  addressToHash(address: string): string {
    return Buffer.from(Address.from_bech32(address).to_bytes()).toString('hex');
  }

  /**
   * @description This function cuts prefix and stakeKeyHash from the addressHash
   *
   * Example:
   *
   * 01 is prefix
   *
   * 5bf3771b2beb3179319c6888ad250f3e8f5a0266e515174b8be250c7 is blake224
   *
   * f17f72273798946caf58b92787a9b6cb5e3d298dadd2c702c814f630 is stakeKeyHash
   *
   * @param addressHash hash of an address e.g. 015bf3771b2beb3179319c6888ad250f3e8f5a0266e515174b8be250c7f17f72273798946caf58b92787a9b6cb5e3d298dadd2c702c814f630
   * @returns blake224 hash e.g. 5bf3771b2beb3179319c6888ad250f3e8f5a0266e515174b8be250c7
   */
  addressHashToBlake224(addressHash: string): string {
    const PREFIX_LENGTH = 2;
    return addressHash.slice(PREFIX_LENGTH, BLAKE_224_LENGTH + PREFIX_LENGTH);
  }

  /**
   * @param address bech32 address format e.g. addr1q9dlxacm904nz7f3n35g3tf9pulg7kszvmj3296t3039p3l30aezwducj3k27k9ey7r6ndkttc7jnrdd6trs9jq57ccqa3l9g0
   * @returns blake224 hash e.g. 5bf3771b2beb3179319c6888ad250f3e8f5a0266e515174b8be250c7
   */
  addressToBlake224(address: string): string {
    return this.addressHashToBlake224(this.addressToHash(address));
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
