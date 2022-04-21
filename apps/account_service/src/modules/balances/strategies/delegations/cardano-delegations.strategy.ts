import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { isCardanoAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './index';

@Injectable()
export class CardanoDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;

  protected url = 'https://cardano-mainnet.blockfrost.io/api/v0';

  private headers = {
    // eslint-disable-next-line camelcase
    project_id: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
  };

  constructor(
    private configService: ConfigService,
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
      address: CARDANO_COIN_ADDRESS,
      chain: ChainIdEnum.cardano,
    });
  }

  private async getFeatures(address: string): Promise<any[]> {
    const getConfig = { headers: this.headers };

    const { data: addressResponse } = await lastValueFrom(
      this.http.get(`${this.url}/addresses/${address}`, getConfig),
    );
    const { data: stakeData } = await lastValueFrom(
      this.http.get(`${this.url}/accounts/${addressResponse.stake_address}`, getConfig),
    );
    const { data: poolData } = await lastValueFrom(
      this.http.get(`${this.url}/pools/${stakeData.pool_id}/metadata`, getConfig),
    );
    return [addressResponse, stakeData, poolData];
  }

  public async getDelegatedAssets(address) {
    if (!isCardanoAddress(address)) return [];

    const [{ prices }, [, stakeData, poolData]] = await Promise.all([
      this.priceService.fetchTokenPrices([this.asset.address], this.asset.chain),
      this.getFeatures(address),
    ]);

    const balanceAmount = normalizeDecimals(stakeData.controlled_amount, this.asset.decimals);
    const claimableRewardsAmount = normalizeDecimals(stakeData.rewards_sum, this.asset.decimals);
    const price = prices[this.asset.address];

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
          amount: balanceAmount,
          amountUsd: balanceAmount * price,
        },
        claimableRewards: {
          amount: claimableRewardsAmount,
          amountUsd: claimableRewardsAmount * price,
        },
      },
    ];
  }
}
