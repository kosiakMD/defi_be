import { LCDClient } from '@terra-money/terra.js';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AstroportProtocolEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataLocked, LockedToken } from '@app/common/dto/base.data.locked.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';
import { Web3ProviderService } from '@app/common/web3provider';

import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservices/account.service';
import { AstroportAddresses } from './addresses';

@Injectable()
export class AstroportBootstrap {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3ProviderService,
    private readonly accountService: AccountService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const addressesLowerCase = addresses.map((address) => address.toLowerCase());
    const cacheKeyTerraswap = `${chain.id}_${AstroportProtocolEnum.astroport}_${FeatureEnum.pools}`;
    const cachedTerraswapPools: NotifyPools = await this.cache.get(cacheKeyTerraswap);
    if (!cachedTerraswapPools) {
      throw new Error(`not found cached data for key '${cacheKeyTerraswap}'`);
    }

    const lcdClient: LCDClient = this.web3Provider.getInstanceByChainId(chain.id);
    const baseData: BaseDataLocked[] = [];
    const stakingFeature = cachedTerraswapPools.items.find(
      (item) => item.lpToken.address === AstroportAddresses.astroUstLp,
    );
    const astroToken = await this.accountService.getTrackedAssets(
      AstroportAddresses.astro,
      chain.id,
    );

    await Promise.all(
      addressesLowerCase.map(async (address) => {
        const addressItems = [];
        const userInfo = await lcdClient.wasm.contractQuery(AstroportAddresses.bootstrapAddress, {
          // eslint-disable-next-line camelcase
          user_info: {
            address: address,
          },
        });

        if (Number(userInfo['withdrawable_lp_shares']) > 0) {
          const withdrawBalanceDec = toDecimals(
            userInfo['withdrawable_lp_shares'],
            stakingFeature.lpToken.decimals,
          );
          const duplicateLp: LiquidityPoolFeature = JSON.parse(JSON.stringify(stakingFeature));

          const poolShare = new BigNumber(withdrawBalanceDec).div(duplicateLp.lpToken.totalSupply);
          duplicateLp.tokens.map((token) => {
            token.balance = poolShare.times(token.reserve).toNumber();
            token.price = null;
            token.value = null;
          });

          addressItems.push(
            plainToClass(LockedToken, {
              unlocked: {
                balance: withdrawBalanceDec,
                value: null,
              },
              rewards: plainToClass(IntegrationERC20TokenDto, {
                address: astroToken.address,
                name: astroToken.name,
                symbol: astroToken.symbol,
                decimals: astroToken.decimals,
                price: null,
                balance: toDecimals(userInfo['claimable_generator_astro'], astroToken.decimals),
                value: null,
              }),
              tokens: duplicateLp.tokens,
              ...duplicateLp.lpToken,
            }),
          );
        }

        const toAdd: BaseDataLocked = plainToClass(BaseDataLocked, {
          chain: chain,
          userAddress: address,
          protocolType: ProtocolTypeEnum.bootstrap,
          projectName: ProjectEnum.astroport,
          items: addressItems,
          feature: FeatureEnum.bootstrap,
        });
        baseData.push(toAdd);
      }),
    );
    return baseData;
  }
}
