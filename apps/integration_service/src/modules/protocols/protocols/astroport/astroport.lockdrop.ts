import { LCDClient } from '@terra-money/terra.js';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
  TerraswapProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { BaseDataLocked, LockedToken } from '@app/common/dto/base.data.locked.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';
import { dateToTimestamp } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';

import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservices/account.service';
import { AstroportAddresses } from './addresses';

@Injectable()
export class AstroportLockdrop {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3ProviderService,
    private readonly accountService: AccountService,
  ) {}
  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const addressesLowerCase = addresses.map((address) => address.toLowerCase());
    const cacheKeyTerraswap = `${chain.id}_${TerraswapProtocolEnum.terraswap}_${FeatureEnum.pools}`;
    const cachedTerraswapPools: NotifyPools = await this.cache.get(cacheKeyTerraswap);
    if (!cachedTerraswapPools) {
      throw new Error(`not found cached data for key '${cacheKeyTerraswap}'`);
    }

    const lcdClient: LCDClient = this.web3Provider.getInstanceByChainId(chain.id);
    const baseData: BaseDataLocked[] = [];
    const astroToken = await this.accountService.getTrackedAssets(
      AstroportAddresses.astro,
      chain.id,
    );
    await Promise.all(
      addressesLowerCase.map(async (address) => {
        const userInfo = await lcdClient.wasm.contractQuery(AstroportAddresses.lockdropAddress, {
          // eslint-disable-next-line camelcase
          user_info: {
            address: address,
          },
        });

        const lockupInfoTokens = userInfo['lockup_infos']
          ?.map((info) => {
            if (info.unlock_timestamp < dateToTimestamp(new Date())) return;
            const terraswapCacheItem = cachedTerraswapPools.items.find(
              (item) => item.lpToken.address === info.terraswap_lp_token,
            );
            const pool: LiquidityPoolFeature = JSON.parse(JSON.stringify(terraswapCacheItem));
            pool.lpToken.symbol = pool.name;
            const lockedBalanceDec = toDecimals(
              info.lp_units_locked,
              terraswapCacheItem.lpToken.decimals,
            );

            const poolShare = new BigNumber(lockedBalanceDec).div(pool.lpToken.totalSupply);
            pool.tokens.forEach((token) => {
              token.balance = poolShare.times(token.reserve).toNumber();
              token.value = null;
              token.price = null;
            });

            return plainToClass(LockedToken, {
              locked: {
                balance: lockedBalanceDec,
                value: null,
              },
              rewards: plainToClass(IntegrationERC20TokenDto, {
                address: astroToken.address,
                name: astroToken.name,
                symbol: astroToken.symbol,
                decimals: astroToken.decimals,
                price: null,
                balance: toDecimals(info.claimable_generator_astro_debt, 6),
                value: null,
              }),
              tokens: pool.tokens,
              ...pool.lpToken,
            });
          })
          .filter((lockdropInfo) => lockdropInfo);
        const toAdd: BaseDataLocked = plainToClass(BaseDataLocked, {
          chain: chain,
          userAddress: address,
          protocolType: ProtocolTypeEnum.lockdrop,
          projectName: ProjectEnum.astroport,
          items: lockupInfoTokens,
          feature: FeatureEnum.lockedBalances,
        });
        baseData.push(toAdd);
      }),
    );
    return baseData;
  }
}
