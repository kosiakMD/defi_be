import { lastValueFrom, map, switchMap } from 'rxjs';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './delegation.strategy';

@Injectable()
export class CardanoDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;

  protected url: string;
  protected path = 'api/v0';

  private headers = {
    // eslint-disable-next-line camelcase
    project_id: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpService,
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
  ) {
    super();
    this.url = new URL(
      this.path,
      this.configService.get<string>('CARDANO_DELEGATION_API_URL'),
    ).toString();
  }

  async onModuleInit(): Promise<void> {
    this.asset = await this.assetsRepository.findOne({
      address: CARDANO_COIN_ADDRESS,
      // TODO: This chain id cannot be hardcoded
      chain: ChainIdEnum.cardano,
    });
  }

  private async getFeatures(address: string): Promise<any[]> {
    const getConfig = { headers: this.headers };

    return lastValueFrom(
      this.http
        .get<any>(`${this.url}/addresses/${address}`, getConfig)
        .pipe(
          switchMap(({ data: addressResponse }) =>
            this.http
              .get<any>(`${this.url}/accounts/${addressResponse.stake_address}`, getConfig)
              .pipe(
                switchMap(({ data: stakeData }) =>
                  this.http
                    .get<any>(`${this.url}/pools/${stakeData.pool_id}/metadata`, getConfig)
                    .pipe(map(({ data: poolData }) => [stakeData, poolData])),
                ),
              ),
          ),
        ),
    );
  }

  public async getDelegatedAssets(address): Promise<any[]> {
    // if (!isCardanoLikeAddress(address)) return [];

    try {
      const [{ prices }, [stakeData, poolData]] = await Promise.all([
        this.priceService.fetchTokenPrices([this.asset.address], this.asset.chain),
        this.getFeatures(address),
      ]);

      const balanceAmount = normalizeDecimals(stakeData.controlled_amount, this.asset.decimals);
      const claimableRewardsAmount = normalizeDecimals(stakeData.rewards_sum, this.asset.decimals);
      const price = prices[this.asset.address];
      return [
        {
          address,
          // TODO: add correct AssetDTO extended from AssetEntity
          //  with omitting redundant methods and properties
          asset: { ...this.asset, price },
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
    } catch (err) {
      // TODO: We should expose error and handle in upstream code
      this.logger.error(err);
      throw err;
    }
  }
}
