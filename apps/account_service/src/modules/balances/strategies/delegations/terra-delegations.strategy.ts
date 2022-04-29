import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { isTerraAddress, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../../../../common/providers/microservices/price/price.service';

import { StaderAddresses } from '../../../../../../integration_service/src/modules/protocols/protocols/stader/stader.addresses';
import { AssetsEntity } from '../../../assets/entities/assets.entity';
import { DelegationsStrategy } from './delegation.strategy';

@Injectable()
export class TerraDelegationsStrategy extends DelegationsStrategy implements OnModuleInit {
  private asset: AssetsEntity;

  protected readonly url: string;
  protected readonly path = 'cosmos/staking/v1beta1/validators';

  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpService,
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
  ) {
    super();

    this.url = new URL(this.path, this.configService.get<string>('TERRA_URL')).toString();
  }

  async onModuleInit(): Promise<void> {
    this.asset = await this.assetsRepository.findOne({
      address: StaderAddresses.luna,
      chain: ChainIdEnum.terra,
    });
  }

  private async getData(address: string): Promise<any[]> {
    const validators = await this.getValidators();

    const promises = validators.map((validator) =>
      lastValueFrom(
        this.http.get(`${this.url}/${validator.operator_address}/delegations/${address}`),
      ),
    );

    const data = handlePromiseAllSettled(await Promise.allSettled(promises))[0];

    return [validators, data];
  }

  public async getDelegatedAssets(address) {
    if (!isTerraAddress(address)) return [];
    const result = [];

    try {
      const [{ prices }, [validators, data]] = await Promise.all([
        this.priceService.fetchTokenPrices([this.asset.address], this.asset.chain),
        this.getData(address),
      ]);

      const validatorsMap: Map<string, any> = new Map(
        validators.map((v) => [v.operator_address, v]),
      );

      data.forEach((r) => {
        const validator = validatorsMap.get(
          r.data.delegation_response.delegation.validator_address,
        );
        const balanceAmount = normalizeDecimals(
          r.data.delegation_response.balance.amount,
          this.asset.decimals,
        );
        const price = prices[this.asset.address];

        result.push({
          address,
          // TODO: add correct AssetDTO extended from AssetEntity
          //  with omitting redundant methods and properties
          asset: { ...this.asset, price },
          validator: {
            address: validator.operator_address,
            name: validator.description.moniker,
            website: validator.description.website,
          },
          balance: {
            amount: balanceAmount,
            amountUsd: balanceAmount * price,
          },
        });
      });

      return result;
    } catch (err) {
      // TODO: We should expose error and handle in upstream code
      this.logger.error(err);
      throw err;
    }
  }

  private async getValidators() {
    const validatorsData = await lastValueFrom(
      this.http.get(`${this.url}?pagination.limit=999`).pipe(map(({ data }) => data)),
    );

    return validatorsData.validators.filter((v) => !v.jailed);
  }
}
