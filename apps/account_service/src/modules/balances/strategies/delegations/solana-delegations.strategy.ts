import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { SOL_COIN_ADDRESS } from '@app/common/constant/index';
import { isSolAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './index';

@Injectable()
export class SolanaDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;

  protected url = 'https://api.solanabeach.io/v1/account';

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
      address: SOL_COIN_ADDRESS,
      chain: ChainIdEnum.sol,
    });
  }

  private async getData(address: string): Promise<any[]> {
    const stakesData = await lastValueFrom(
      this.httpService
        .get(`${this.url}/${address}/stakes?limit=1000`)
        .pipe(map(({ data: { data } }) => data)),
    );

    const stakingRewardsPromises = stakesData.map((staking) =>
      lastValueFrom(
        this.httpService
          .get(`${this.url}/${staking.pubkey.address}/stake-rewards`)
          .pipe(map(({ data }) => data)),
      ),
    );

    const stakingRewardsData = await Promise.all(stakingRewardsPromises);

    return [stakesData, stakingRewardsData];
  }

  public async getDelegatedAssets(address) {
    if (!isSolAddress(address)) return [];
    const result = [];

    const [{ prices }, [stakesData, stakingRewardsData]] = await Promise.all([
      this.priceService.fetchTokenPrices([this.asset.address], this.asset.chain),
      this.getData(address),
    ]);

    stakesData.forEach((staking) => {
      const stakingReward = stakingRewardsData[0];
      if (stakingReward) {
        const balanceAmount = normalizeDecimals(stakingReward.postBalance, this.asset.decimals);
        const claimableRewardsAmount = normalizeDecimals(stakingReward.amount, this.asset.decimals);
        const price = prices[this.asset.address];
        const validator = staking.data.stake.delegation.validatorInfo;

        result.push({
          address,
          // TODO: add correct AssetDTO extended from AssetEntity
          //  with omitting redundant methods and properties
          asset: { ...this.asset, price: prices[this.asset.address] },
          validator: {
            address: validator.identityPubkey,
            name: validator.name,
            logo: validator.image,
            website: validator.website,
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
    });

    return result;
  }
}
