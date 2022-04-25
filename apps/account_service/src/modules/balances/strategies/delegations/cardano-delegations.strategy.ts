import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { isCardanoAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './index';

@Injectable()
export class CardanoDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;
  constructor(
    private readonly http: HttpService,
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.asset = await this.assetsRepository.findOne({
      address: 'addr100000000000000000000000000000000000000000000',
      // TODO: This chain id cannot be hardcoded
      chain: 22,
    });
  }

  // TODO: Move to .env?
  url = 'https://cardano-mainnet.blockfrost.io/api/v0';

  private headers = {
    // eslint-disable-next-line camelcase
    // TODO: Move to .env
    project_id: 'mainnetDGLOdhwzeWRwDgIrlO22kRh3BJwPA2t0',
  };

  public async getDelegatedAssets(address) {
    if (!isCardanoAddress(address)) return [];
    const { prices } = await this.priceService.fetchTokenPrices(
      [this.asset.address],
      this.asset.chain,
    );

    try {
      const { data: addressResponse } = await this.http
        .get(`${this.url}/addresses/${address}`, { headers: this.headers })
        // TODO: Not use this method as it will be deprecated
        .toPromise();

      const { data: stakeData } = await this.http
        .get(`${this.url}/accounts/${addressResponse.stake_address}`, { headers: this.headers })
        .toPromise();

      const { data: poolData } = await this.http
        .get(`${this.url}/pools/${stakeData.pool_id}/metadata`, { headers: this.headers })
        .toPromise();

      return [
        {
          address,
          asset: { ...this.asset, price: prices[this.asset.address] },
          validator: {
            address: poolData.pool_id,
            name: poolData.name,
            website: poolData.homepage,
          },
          balance: {
            amount: normalizeDecimals(stakeData.controlled_amount, this.asset.decimals),
            amountUsd:
              normalizeDecimals(stakeData.controlled_amount, this.asset.decimals) *
              prices[this.asset.address],
          },
          claimableRewards: {
            amount: normalizeDecimals(stakeData.rewards_sum, this.asset.decimals),
            amountUsd:
              normalizeDecimals(stakeData.rewards_sum, this.asset.decimals) *
              prices[this.asset.address],
          },
        },
      ];
    } catch (err) {
      // TODO: We should expose error and handle in upstream code
      this.logger.error(err);
    }
  }
}
