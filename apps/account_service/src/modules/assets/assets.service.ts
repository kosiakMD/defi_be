import { catchError, lastValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { Address } from '@app/common/types';

import { PriceServiceResponse } from '../../common/interfaces/prices.comon.interfaces';
import { HistoricalPricesMap } from '../../common/providers/microservices/price/dto/price.response.dto';

import { PriceResponseDto } from './dto/prices-response.dto';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';

@Injectable()
export class AssetsService {
  private url: string;

  constructor(
    @InjectRepository(AssetsRepository) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('ASSETS_SERVICE_HOST');
    const port = this.configService.get<string>('ASSETS_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;
    this.url = url;
  }

  public async fetchAssets(addresses: Address[], chainId: number, pricesAt?: number[]) {
    const assetsRequest = addresses.map((address: Address) => ({ address, chainId, pricesAt }));
    return await lastValueFrom(
      this.http.post(this.url + 'v1/assets/get-bulk', { assets: assetsRequest }).pipe(
        map(({ data }) => data.assets),
        catchError((err, caught) => caught),
      ),
    );
  }

  public async getPricesForAssets(addresses: Address[], chainId: number, pricesAt?: number[]) {
    const assets = await this.fetchAssets(addresses, chainId, pricesAt);
    const prices = {};
    for (const asset of assets) {
      prices[asset.address] = asset.price;
    }
    return new PriceResponseDto(prices);
  }

  public async findByAddressAndChain(address: Address, chainId: number): Promise<AssetsEntity> {
    const [asset] = await this.fetchAssets([address], chainId);
    return asset;
  }

  public async getMultipleHistoricalPrices(
    assets: { address: string; timestamps: number[] }[],
    chainId,
  ): Promise<PriceServiceResponse<HistoricalPricesMap>> {
    const pricesMap = new Map();
    for (const asset of assets) {
      const a = await this.fetchAssets([asset.address], chainId, asset.timestamps);
      const historicalPrices = {};

      for (const hp of a.historicalPrices) {
        historicalPrices[hp.timestamp] = hp.price;
      }

      pricesMap.set(asset.address, historicalPrices);
    }

    // TODO: this method returns historical prices for assets. returns type HistoricalPricesMap = Map<Address, HistoricalPrices>;
    return new PriceResponseDto(pricesMap);
  }

  // TODO: Review this method || TBD for deletion
  // async getAssetAndPoolObjects(chainId: number): Promise<AssetsPoolsDto[]> {
  //   const assetsPools = await this.assetRepository.findAllTrackedAssetsWithPoolsByChain(chainId);
  //   return assetsPools.map((pool) => plainToClass(AssetsPoolsDto, pool));
  // }
}
