import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { SOL_COIN_ADDRESS } from '@app/common/constant';
import { isSolAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './delegation.strategy';

@Injectable()
export class SolanaDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;

  protected url: string;
  protected path = 'v1/account';

  constructor(
    private readonly configService: ConfigService,
    private httpService: HttpService,
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
  ) {
    super();

    this.url = new URL(
      this.path,
      this.configService.get<string>('SOLANA_DELEGATION_API_URL'),
    ).toString();
  }

  async onModuleInit(): Promise<void> {
    this.asset = await this.assetsRepository.findOne({
      address: SOL_COIN_ADDRESS,
      chain: ChainIdEnum.sol,
    });
  }

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
          const balanceAmount = normalizeDecimals(stakingReward.postBalance, this.asset.decimals);
          const claimableRewardsAmount = normalizeDecimals(
            stakingReward.amount,
            this.asset.decimals,
          );
          const price = prices[this.asset.address];
          const { identityPubkey, name, image, website } =
            staking.data.stake.delegation.validatorInfo;

          result.push({
            address,
            // TODO: add correct AssetDTO extended from AssetEntity
            //  with omitting redundant methods and properties
            asset: { ...this.asset, price },
            validator: {
              address: identityPubkey,
              name: name,
              logo: image,
              website: website,
            },
            balance: {
              amount: balanceAmount,
              amountUsd: balanceAmount * price,
            },
            claimableRewards: {
              amount: claimableRewardsAmount,
              amountUsd: claimableRewardsAmount * price,
            },
          });
        }
      }
      return result;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
}
