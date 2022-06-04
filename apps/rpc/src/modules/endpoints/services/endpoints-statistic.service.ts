import { CallsStatistic } from 'apps/rpc/src/common/dto/CallsStatistic.dto';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable, OnModuleInit, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId } from '@app/common';
import { Logger } from '@app/common/Logger';

import { EndpointEntity } from '../endpoint.entity';
import { EndpointCallScore } from '../endpoints.enums';
import { EndpointsRepository } from '../endpoints.repository';
import { EndpointStatistic, SuccessScore } from '../endpoints.types';

type EndpointsToChainMap = Map<ChainId, EndpointStatistic[]>;

@Injectable({ scope: Scope.DEFAULT })
export class EndpointsStatisticService implements OnModuleInit {
  private readonly endpointsSuccessRateTTL: number;
  private readonly endpointsSuccessRateMaxItemsNum: number;
  private readonly endpointsSuccessRateHistoryTTL: number;

  private endpointsMap: EndpointsToChainMap = new Map<ChainId, EndpointStatistic[]>();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    @InjectRepository(EndpointsRepository)
    private readonly endpointsRepository: EndpointsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.endpointsSuccessRateTTL = configService.get<number>('ENDPOINTS_SUCCESS_RATE_TTL');
    this.endpointsSuccessRateMaxItemsNum = configService.get<number>(
      'ENDPOINTS_SUCCESS_RATE_MAX_ITEMS_NUM',
    );
    this.endpointsSuccessRateHistoryTTL =
      (this.configService.get<number>('ENDPOINTS_SUCCESS_RATE_HISTORY_TTL') || 24 * 60) * 1000;
  }

  onModuleInit() {
    return this.syncEndpointsFromDatabase();
  }

  // TODO: How is that handled in case of few services are up?
  @Cron(CronExpression.EVERY_30_SECONDS)
  async cronUpdateEndpointsPriority() {
    try {
      this.logger.log('Updating endpoints priority');
      await this.updateEndpointsPriority();
    } catch (e) {
      this.logger.error('Updating endpoints priority failed', e);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cronSyncEndpointsFromDatabase() {
    try {
      this.logger.log('Sync endpoints from database');
      await this.syncEndpointsFromDatabase();
    } catch (e) {
      this.logger.error('Sync endpoints from database', e);
    }
  }

  public getEndpointsMap(): EndpointsToChainMap {
    return this.endpointsMap;
  }

  public getEndpointByPriority(chainId: number, archive: boolean): EndpointEntity[] {
    const endpoints = this.endpointsMap.get(chainId) || [];
    return endpoints
      .filter((endpoint) => endpoint.endpoint.archived === archive)
      .map(({ endpoint }) => endpoint);
  }

  // TODO: We should batch this, it's going to do too many calls to cache
  public async updateEndpointSuccessRate(
    endpoint: EndpointEntity,
    scoreValue: EndpointCallScore,
  ): Promise<void> {
    const endpointSuccessScores = await this.getEndpointSuccessScoreFromCache(endpoint);
    const newEndpointScore: SuccessScore = { value: scoreValue, timestamp: Date.now() };
    const updatedEndpointScores = [newEndpointScore].concat(
      this.filterOutdatedEndpointScores(endpointSuccessScores),
    );
    await this.setEndpointToRPCSuccessRateCache(endpoint, updatedEndpointScores);
  }

  public async updateEndpointsPriority(): Promise<void> {
    const chainIds = this.endpointsMap.keys();
    for await (const chainId of chainIds) {
      const endpointStatistics = this.endpointsMap.get(chainId);
      const updatedEndpointStatistics = [];
      for await (const endpointStatistic of endpointStatistics) {
        const { endpoint } = endpointStatistic;
        const successScores = await this.getEndpointSuccessScoreFromCache(endpoint);
        endpointStatistic.callsStatistic = new CallsStatistic(successScores);
        updatedEndpointStatistics.push(endpointStatistic);
      }
      const orderedEndpointStatistics = updatedEndpointStatistics.sort(
        this.compareEndpointStatistic,
      );
      this.endpointsMap.set(chainId, orderedEndpointStatistics);
    }
  }

  private compareEndpointStatistic(a: EndpointStatistic, b: EndpointStatistic) {
    if ((a.endpoint.priority = b.endpoint.priority)) {
      return b.callsStatistic.successRating - a.callsStatistic.successRating;
    }
    return b.endpoint.priority - a.endpoint.priority;
  }

  public async syncEndpointsFromDatabase(): Promise<any> {
    const newEndpointMap = new Map<ChainId, EndpointStatistic[]>();
    const endpoints = await this.endpointsRepository.getAll();
    endpoints.forEach((endpoint: EndpointEntity) => {
      const prevEndpoints = this.endpointsMap.get(endpoint.chainId);
      const prevEndpoint = prevEndpoints?.find(
        (prevEndpoint) => prevEndpoint.endpoint.id === endpoint.id,
      );
      const callsStatistic = prevEndpoint?.callsStatistic || new CallsStatistic();
      const newEndpoint: EndpointStatistic = { callsStatistic, endpoint };

      const chainEndpoints = newEndpointMap.get(endpoint.chainId) || [];
      newEndpointMap.set(endpoint.chainId, chainEndpoints.concat([newEndpoint]));
    });

    this.endpointsMap = newEndpointMap;
    await this.updateEndpointsPriority();
  }

  private endpointScoresCacheKey({
    chainId,
    endpoint,
  }: {
    chainId: ChainId;
    endpoint: string;
  }): string {
    return `endpoint_score_${chainId}_${endpoint}`;
  }

  private filterOutdatedEndpointScores(endpointSuccessScores: SuccessScore[]): SuccessScore[] {
    const now = Date.now();
    return endpointSuccessScores.filter(
      (score: SuccessScore, index: number) =>
        index < this.endpointsSuccessRateMaxItemsNum - 1 &&
        now - score.timestamp < this.endpointsSuccessRateTTL,
    );
  }

  private async getEndpointSuccessScoreFromCache(
    endpoint: EndpointEntity,
  ): Promise<SuccessScore[]> {
    const cacheKey = this.endpointScoresCacheKey(endpoint);
    const endpointSuccessScores: string = await this.cacheManager.get(cacheKey);
    return JSON.parse(endpointSuccessScores || '[]');
  }

  private async setEndpointToRPCSuccessRateCache(
    endpoint: EndpointEntity,
    successScores: SuccessScore[],
  ): Promise<void> {
    const cacheKey = this.endpointScoresCacheKey(endpoint);
    await this.cacheManager.set(cacheKey, JSON.stringify(successScores), {
      ttl: this.endpointsSuccessRateHistoryTTL,
    });
  }
}
