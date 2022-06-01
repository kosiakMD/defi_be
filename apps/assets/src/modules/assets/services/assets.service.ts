import { AssetReference } from 'apps/assets/src/common/types';
import { Queue } from 'bull';
import { plainToClass } from 'class-transformer';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';
import { isSomeAddress } from '@app/common/utils';

import { JobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { SearchResultType } from '../../../common/enum/search-result-type.enum';
import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { AssetAvgPrice, PriceService } from '../../prices/price.service';
import { AssetsHistoricalPriceRepository } from '../../prices/repositories/asset-historical-price.repository';
import { AssetCandidateRequest } from '../dto/asset-candidate.request';
import { AssetCategoryDto } from '../dto/asset-category.dto';
import { AssetHistoricalPriceDto } from '../dto/asset-historical-price.dto';
import { AssetUnderlyingDto } from '../dto/asset-underlying.dto';
import { AssetDto } from '../dto/asset.dto';
import { GetAssetRequest } from '../dto/get-asset.request';
import { SearchResultsEntryDto } from '../dto/search-results-entry.dto';
import { AssetEntity } from '../entities/asset.entity';
import { AssetsCandidateRepository } from '../repositories/assets-candidate.repository';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { AssetsRepository } from '../repositories/assets.repository';
import { AssetAnalyserService } from './asset-analyser.service';

@Injectable()
export class AssetsService extends CrudService<AssetsRepository> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    private readonly assetsRepository: AssetsCachedRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
    @InjectRepository(AssetsCandidateRepository)
    private readonly assetsCandidateRepository: AssetsCandidateRepository,
    private readonly priceService: PriceService,
    private readonly assetAnalyserService: AssetAnalyserService,
  ) {
    super(AssetsCachedRepository);
  }

  public async getAsset(request: GetAssetRequest): Promise<AssetDto> {
    const [response] = await this.getBulkAssets([request]);
    return response;
  }

  public async getBulkAssets(requests: GetAssetRequest[]): Promise<AssetDto[]> {
    const validRequests = requests.filter(({ address }) => isSomeAddress(address));
    const assets = await this.getAssets(validRequests);
    // TODO: Historical prices are not handled
    // TODO: Add mapping, not expose everything (e.g. created at)
    // TODO: This mapping code looks ugly, it should be extracted into mapper or use https://www.npmjs.com/package/@automapper/nestjs
    const dtos = assets.map((asset) => this.mapAssetToDto(asset));

    return this.addPrices(dtos);
  }

  private async addPrices(dtos: AssetDto[]): Promise<AssetDto[]> {
    const assets = this.getAllNestedAssets(dtos);
    const prices = await this.priceService.getPrices(assets);
    this.updateDtosWithPrices(dtos, prices);
    return this.assetAnalyserService.updateSpecificAssetsPrices(dtos);
  }

  private getAllNestedAssets(dtos: AssetDto[]): AssetReference[] {
    const getKey = (ar: AssetReference) => `${ar.chainId}_${ar.address}`;
    const map = new Map<string, AssetReference>();
    for (const dto of dtos) {
      const assets = this.getDtoNestedAssets(dto);
      for (const asset of assets) {
        const key = getKey(asset);
        map.set(key, asset);
      }
    }
    return [...map.values()];
  }

  private getDtoNestedAssets(dto: AssetDto): AssetReference[] {
    return [
      { chainId: dto.chainId, address: dto.address },
      ...(dto.underlying || [])
        .map(({ underlyingAsset }) => this.getDtoNestedAssets(underlyingAsset))
        .flat(),
    ];
  }

  private updateDtosWithPrices(dtos: AssetDto[], prices: AssetAvgPrice[]) {
    for (const dto of dtos) {
      this.updateDtoWithPrices(dto, prices);
    }
  }

  private updateDtoWithPrices(dto: AssetDto, prices: AssetAvgPrice[]) {
    const assetPrice = prices.find(
      ({ asset }) => asset.address === dto.address && asset.chainId === dto.chainId,
    );
    dto.price = assetPrice?.price;
    if (!dto.underlying?.length) {
      return;
    }
    this.updateDtosWithPrices(
      dto.underlying.map(({ underlyingAsset }) => underlyingAsset),
      prices,
    );
  }

  private async getAssets(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const assets = await this.assetsRepository.findManyByAddressesAndChainIds(requests);
    if (assets.length === requests.length) {
      return assets;
    }

    const unknownAssetsRequests = this.excludeFoundAssets(requests, assets);
    this.processAssets(unknownAssetsRequests);

    return assets;
  }

  private excludeFoundAssets(requests: GetAssetRequest[], assets: AssetEntity[]) {
    return requests.filter(
      (request) => !assets.some((asset) => this.isRequestMatchingAsset(request, asset)),
    );
  }

  private isRequestMatchingAsset(request: GetAssetRequest, asset: AssetEntity) {
    return (
      request.chainId === asset.chainId &&
      request.address?.toLowerCase() === asset.address?.toLowerCase()
    );
  }

  private async processAssets(requests: GetAssetRequest[]): Promise<void> {
    requests.map((request) => {
      this.logger.log('Send asset for processing', request);
      return this.assetsQueue.add(JobName.ASSET_METADATA, {
        address: request.address,
        chainId: request.chainId,
      });
    });
  }

  private mapAssetToDto(asset: AssetEntity) {
    return plainToClass(AssetDto, {
      ...asset,
      categories: asset.categories?.map((assetCategory) =>
        plainToClass(AssetCategoryDto, assetCategory),
      ),
      ...(asset.historicalPrices
        ? {
            historicalPrices: asset.historicalPrices.map((historicalPrice) =>
              plainToClass(AssetHistoricalPriceDto, historicalPrice),
            ),
          }
        : {}),
      ...(asset.underlying
        ? {
            underlying: asset.underlying.map((underlyingAsset) =>
              plainToClass(AssetUnderlyingDto, underlyingAsset),
            ),
          }
        : {}),
    });
  }

  public async search(searchParams: SearchParams): Promise<SearchResultsEntryDto[]> {
    const assets = await this.assetsRepository.findAssetsByParams(searchParams);
    return assets.map((asset) => ({
      type: SearchResultType.ASSET,
      icon: asset.icon,
      name: asset.name,
      metadata: {
        address: asset.address,
        chainId: asset.chainId,
        symbol: asset.symbol,
      },
    }));
  }

  public async saveAssetCandidate({ chainId, address }: AssetCandidateRequest) {
    this.logger.log('Saving assets candidate', { chainId, address });
    const existing = await this.assetsCandidateRepository.getBy(chainId, address);
    if (existing) {
      this.logger.log('Assets candidate already exists', { chainId, address });
      return;
    }

    const assetsCandidateEntity = this.assetsCandidateRepository.create({
      address,
      chainId,
    });
    await this.assetsCandidateRepository.save(assetsCandidateEntity);
    this.logger.log('Saved assets candidate', { chainId, address });
  }
}
