import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { isTerraAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './index';

@Injectable()
export class TerraDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
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
      address: 'uluna',
      chain: 19,
    });
  }

  url = 'https://lcd.terra.dev/cosmos/staking/v1beta1/validators';

  public async getDelegatedAssets(address) {
    if (!isTerraAddress(address)) return [];
    const result = [];
    const promises = [];

    try {
      const validators = await this.getValidators();
      const { prices } = await this.priceService.fetchTokenPrices(
        [this.asset.address],
        this.asset.chain,
      );

      for (const validator of validators) {
        promises.push(
          this.http
            .get(`${this.url}/${validator.operator_address}/delegations/${address}`)
            .toPromise(),
        );
      }

      const results = await Promise.allSettled(promises);
      const [data] = handlePromiseAllSettled(results);

      data.forEach((r) => {
        const validator = validators.find(
          (v) => v.operator_address === r.data.delegation_response.delegation.validator_address,
        );
        result.push({
          address,
          asset: { ...this.asset, price: prices[this.asset.address] },
          validator: {
            address: validator.operator_address,
            name: validator.description.moniker,
            website: validator.description.website,
          },
          balance: {
            amount: normalizeDecimals(
              r.data.delegation_response.balance.amount,
              this.asset.decimals,
            ),
            amountUsd:
              normalizeDecimals(r.data.delegation_response.balance.amount, this.asset.decimals) *
              prices[this.asset.address],
          },
        });
      });

      return result;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async getValidators() {
    const { data: validatorsData } = await this.http
      .get(`${this.url}?pagination.limit=999`)
      .toPromise();

    return validatorsData.validators.filter((v) => !v.jailed);
  }
}
