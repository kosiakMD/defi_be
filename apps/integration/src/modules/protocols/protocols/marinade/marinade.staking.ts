import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { cloneDeep } from 'lodash';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { Address, ChainDto, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  Stats,
} from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';

@Injectable()
export class MarinadeStaking {
  private readonly stakingContract = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';
  private readonly statsApiAPY = 'https://api.marinade.finance/msol/apy/1y';
  private readonly statsApiTVL = 'https://api.marinade.finance/tlv';
  private readonly stakedToken = '11111111111111111111111111111111';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly httpService: HttpService,
    private readonly priceService: PriceService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const [lpBalances, stats] = await Promise.all([
      this.accountService.getBalancesPost(addresses, [chain.id], [this.stakingContract]),
      this.getStats(chain.id),
    ]);

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((address) => [
        address,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: address,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.marinade,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const msolTemplate = plainToClass(IntegrationStakingPositionDto, {
      address: this.stakingContract,
      stats: plainToClass(Stats, {
        tvl: stats.tvl,
        poolApy: stats.apr,
      }),
      stakingToken: plainToClass(IntegrationERC20TokenDto, stats.solToken),
      rewards: [plainToClass(IntegrationClaimableTokenDto, stats.solToken)],
    });

    for (const address of addresses) {
      if (!Array.isArray(lpBalances[address].tokens)) continue;
      for (const lpToken of lpBalances[address].tokens) {
        if (lpToken.token.address !== this.stakingContract) continue;
        const position = cloneDeep(msolTemplate);
        const solBalance = lpToken.decimalsAmount * stats.exchangeRate;

        position.stakingToken.balance = solBalance;
        position.stakingToken.value = solBalance * stats.solToken.price;

        position.staked = stats.totalSupplied.toString();

        position.rewards[0].claimableData.balance = 0;
        position.rewards[0].claimableData.value = 0;

        baseDataStakingMap.get(address).items.push(position);
      }
    }

    return Array.from(baseDataStakingMap.values());
  }

  private async getStats(chain: number): Promise<Record<string, any>> {
    const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
    const cached = await this.cache.get('marinade_staking');
    if (cached) return cached;

    const [{ data: apy }, { data: tvl }, assetInfo, { prices }] = await Promise.all([
      firstValueFrom(this.httpService.get(this.statsApiAPY)),
      firstValueFrom(this.httpService.get(this.statsApiTVL)),
      this.accountService.getAssets([this.stakedToken], [chain]),
      this.priceService.getTokenPrices([WRAPPED_SOL], chain),
    ]);

    const solToken = {
      address: assetInfo.data[0].address,
      name: assetInfo.data[0].name,
      symbol: assetInfo.data[0].symbol,
      decimals: assetInfo.data[0].decimals,
      price: prices[WRAPPED_SOL],
    };
    const stats = {
      solToken,
      tvl: tvl.staked_usd,
      totalSupplied: tvl.staked_sol,
      apr: apy.value * 100,
      exchangeRate: apy.end_price,
    };
    await this.cache.set('marinade_staking', stats, { ttl: 60 * 15 });
    return stats;
  }
}
