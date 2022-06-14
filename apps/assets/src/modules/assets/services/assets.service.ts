import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';
import { isSomeAddress } from '@app/common/utils';

import { AssetJobName } from '../../../common/enum/job-name.enum';
import { JobPriority } from '../../../common/enum/job-priority.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { SearchResultType } from '../../../common/enum/search-result-type.enum';
import { SearchParams } from '../../../common/interfaces/search.interfaces';
import { AssetReference } from '../../../common/types';

import { AssetAvgPrice, PriceService } from '../../prices/price.service';
import { AssetsHistoricalPriceRepository } from '../../prices/repositories/asset-historical-price.repository';
import { AssetCandidateRequest } from '../dto/asset-candidate.request';
import { AssetHistoricalPriceDto } from '../dto/asset-historical-price.dto';
import { AssetDto } from '../dto/asset.dto';
import { GetAssetRequest } from '../dto/get-asset.request';
import { SearchResultsEntryDto } from '../dto/search-results-entry.dto';
import { AssetEntity } from '../entities/asset.entity';
import { AssetsCandidateRepository } from '../repositories/assets-candidate.repository';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { AssetsRepository } from '../repositories/assets.repository';
import { HistoricalPriceRequest } from '../types/historical-price-request.type';
import { mapAssetsToPlain } from '../utils/cache-mapping';
import { getAssetProcessJobId } from '../utils/jobs.helper';
import { AssetAnalyserService } from './asset-analyser.service';

@Injectable()
// TODO: Return underlying assets reserves
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
    private readonly config: ConfigService,
  ) {
    super(AssetsCachedRepository);
  }

  public async getAsset(request: GetAssetRequest): Promise<AssetDto[]> {
    return this.getBulkAssets([request]);
  }

  public async getBulkAssets(requests: GetAssetRequest[]): Promise<AssetDto[]> {
    const validRequests = requests.filter(({ address }) => isSomeAddress(address));
    const assets = mapAssetsToPlain(await this.getAssets(validRequests));

    await this.updateAssetsWithHistoricalPrices(requests, assets);

    return this.addPrices(assets);
  }

  private async addPrices(dtos: AssetDto[]): Promise<AssetDto[]> {
    const assets = this.getAllNestedAssets(dtos);
    const prices = await this.priceService.getPrices(assets);
    this.updateDtosWithPrices(dtos, prices);
    const assetsUpdatedWithPrices = await this.assetAnalyserService.updateSpecificAssetsPrices(
      dtos,
    );
    // TODO: improve this dependencies
    const dtosToUpdatePricesInCache = assetsUpdatedWithPrices.filter(({ underlying }) =>
      underlying?.some(({ reserve }) => reserve),
    );

    this.priceService
      .saveSpecificAssetPrices(dtosToUpdatePricesInCache)
      .catch((error) =>
        this.logger.error(
          `Saving ${dtosToUpdatePricesInCache.length} special asset prices failed`,
          error,
        ),
      );

    return assetsUpdatedWithPrices;
  }

  private getAllNestedAssets(dtos: AssetDto[]): AssetReference[] {
    const getKey = (ar: AssetReference) => `${ar.chainId}_${ar.address}`;
    const map = new Map<string, AssetReference>();
    for (const dto of dtos) {
      const key = getKey(dto);
      map.set(key, dto);
    }
    return [...map.values()];
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
    return;
  }

  private async getAssets(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const assets = await this.assetsRepository.findManyByAddressesAndChainIds(requests);
    const assetsToProcess = this.excludeFoundAssets(requests, assets);
    if (assetsToProcess.length) {
      this.processAssets(assetsToProcess).catch((error) =>
        this.logger.error(`Sending ${assetsToProcess.length} assets for processing failed`, error),
      );
    }

    return assets;
  }

  private excludeFoundAssets(requests: GetAssetRequest[], assets: AssetEntity[]) {
    return requests.filter((request) => {
      const foundAsset = assets.find((a) => this.isRequestMatchingAsset(request, a));
      return request.forceUpdate || !foundAsset || this.isAssetOutdated(foundAsset);
    });
  }

  private isRequestMatchingAsset(request: GetAssetRequest, asset: AssetEntity) {
    return (
      request.chainId === asset.chainId &&
      request.address?.toLowerCase() === asset.address?.toLowerCase()
    );
  }

  private isAssetOutdated(asset: AssetEntity): boolean {
    return (
      this.config.get<number>('REPROCESS_ASSET_PERIOD_MS') > 0 &&
      Date.now() - asset.updatedAt.getTime() >= this.config.get<number>('REPROCESS_ASSET_PERIOD_MS')
    );
  }

  private async processAssets(requests: GetAssetRequest[]): Promise<void> {
    requests.map((request) => {
      this.logger.log(`Send asset for processing: ${JSON.stringify(request)}`);
      return this.assetsQueue.add(
        AssetJobName.ASSET_METADATA,
        {
          address: request.address,
          chainId: request.chainId,
          forceUpdate: request.forceUpdate,
        },
        {
          // NOTE: This should prevent process asset jobs duplications
          jobId: getAssetProcessJobId(request),
          priority: JobPriority.HIGH,
        },
      );
    });
  }

  private async updateAssetsWithHistoricalPrices(
    requests: GetAssetRequest[],
    assets: AssetDto[],
  ): Promise<AssetDto[]> {
    const historicalPricesRequests = getHistoricalPricesRequests(requests, assets);
    if (!historicalPricesRequests.length) {
      return assets;
    }
    const historicalPrices = (
      await this.assetsHistoricalPriceRepository.getPrices(historicalPricesRequests)
    ).reduce((priceMap, { asset, price, timestamp }) => {
      const prices = priceMap.get(asset.id) || [];
      prices.push({
        price: price,
        timestamp: timestamp,
      });
      priceMap.set(asset.id, prices);
      return priceMap;
    }, new Map<number, AssetHistoricalPriceDto[]>());
    assets.forEach((asset) => (asset.historicalPrices = historicalPrices.get(asset.id) || []));
    return assets;
  }

  public async search(searchParams: SearchParams): Promise<SearchResultsEntryDto[]> {
    const assets = await this.assetsRepository.findAssetsByParams(searchParams);
    return assets.map((asset) => ({
      type: SearchResultType.ASSET,
      icon: asset.icon,
      name: asset.displayName || asset.symbol || asset.name,
      metadata: {
        rank: asset.rank,
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

function getHistoricalPricesRequests(
  requests: GetAssetRequest[],
  assets: AssetDto[],
): HistoricalPriceRequest[] {
  return requests //
    .filter((request) => request.pricesAt?.length)
    .flatMap((request) => {
      const asset = assets.find(
        (a) => a.address === request.address && a.chainId === request.chainId,
      );
      return asset
        ? [
            {
              assetId: asset.id,
              pricesAt: request.pricesAt,
            },
          ]
        : [];
    });
}
