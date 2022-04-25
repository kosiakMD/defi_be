import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { isSolAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './index';

@Injectable()
export class SolanaDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;
  constructor(
    private httpService: HttpService,
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.asset = await this.assetsRepository.findOne({
      address: '00000000000000000000000000000000000000000000',
      // TODO: This chain id cannot be hardcoded
      chain: 12,
    });
  }

  // TODO: Move to .env?
  url = 'https://api.solanabeach.io/v1/account';

  public async getDelegatedAssets(address) {
    if (!isSolAddress(address)) return [];
    const result = [];

    try {
      const { prices } = await this.priceService.fetchTokenPrices(
        [this.asset.address],
        this.asset.chain,
      );

      const { data: stakesData } = await this.httpService
        .get(`${this.url}/${address}/stakes?limit=1000`)
        .toPromise();

      for (const staking of stakesData.data) {
        const { data: stakingRewardsData } = await this.httpService
          .get(`${this.url}/${staking.pubkey.address}/stake-rewards`)
          .toPromise();

        const stakingReward = stakingRewardsData[0];
        if (stakingReward) {
          result.push({
            address,
            asset: { ...this.asset, price: prices[this.asset.address] },
            validator: {
              address: staking.data.stake.delegation.validatorInfo.identityPubkey,
              name: staking.data.stake.delegation.validatorInfo.name,
              logo: staking.data.stake.delegation.validatorInfo.image,
              website: staking.data.stake.delegation.validatorInfo.website,
            },
            balance: {
              amount: normalizeDecimals(stakingReward.postBalance, this.asset.decimals),
              amountUsd:
                normalizeDecimals(stakingReward.postBalance, this.asset.decimals) *
                prices[this.asset.address],
            },
            claimableRewards: {
              amount: normalizeDecimals(stakingReward.amount, this.asset.decimals),
              amountUsd:
                normalizeDecimals(stakingReward.amount, this.asset.decimals) *
                prices[this.asset.address],
            },
          });
        }
      }
      return result;
    } catch (err) {
      // TODO: We should expose error and handle in upstream code
      this.logger.error(err);
    }
  }
}
