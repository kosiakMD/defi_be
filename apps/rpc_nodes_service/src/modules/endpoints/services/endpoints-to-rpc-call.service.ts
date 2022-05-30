import { CallsStatistic } from 'apps/rpc_nodes_service/src/common/dto/CallsStatistic.dto';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';

import { SortDirectionEnum } from '../../../common/enum/SortDirection.enum';

import { EndpointEntity } from '../endpoint.entity';
import { EndpointsSortFieldEnum, EndpointsSuccessScore } from '../endpoints.enums';
import { EndpointsRepository } from '../endpoints.repository';
import { EndpointToRPCCall, SuccessScore } from '../endpoints.types';

@Injectable()
export class EndpointsToRPCCallService {
  private readonly endpointsToRPCCall = new Map<number, EndpointToRPCCall[]>();
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    @InjectRepository(EndpointsRepository)
    private readonly endpointsRepository: EndpointsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.updateFromDatabaseEndpointsToRPCCall();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleUpdateFromCacheCron() {
    this.logger.log('Called every 10 seconds, sortEndpointsToRPCCallByPriorityAndSuccessRate');
    await this.updateFromCacheAndSortEndpointsToRPCCallByPriorityAndSuccessRate();
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleUpdateFromDatabaseCron() {
    this.logger.log('Called every 30 seconds, updateFromDatabaseEndpointsToRPCCall');
    await this.updateFromDatabaseEndpointsToRPCCall();
  }

  public getAllEndpointsToRPCCall(): Map<number, EndpointToRPCCall[]> {
    return this.endpointsToRPCCall;
  }

  public getEndpointsToRPCCall(chainId: number, archive: boolean): EndpointToRPCCall[] {
    return this.endpointsToRPCCall
      .get(chainId)
      ?.filter((endpoint) => endpoint.endpointsEntity.archived === archive);
  }

  public async updateEndpointSuccessRate(
    endpointToRPCCall: EndpointToRPCCall,
    scoreValue: EndpointsSuccessScore,
  ): Promise<void> {
    const endpointSuccessScores = await this.getEndpointToRPCSuccessRateCache(endpointToRPCCall);
    const newEndpointScores: SuccessScore[] = [{ value: scoreValue, timestamp: Date.now() }];
    const refreshedEndpointSuccessScores = this.filterEndpointSuccessScores(endpointSuccessScores);
    await this.setEndpointToRPCSuccessRateCache(
      endpointToRPCCall,
      newEndpointScores.concat(refreshedEndpointSuccessScores),
    );
  }

  public async updateFromCacheAndSortEndpointsToRPCCallByPriorityAndSuccessRate(): Promise<void> {
    const chainIds = this.endpointsToRPCCall.keys();
    for await (const chainId of chainIds) {
      const endpointsToRPCCall = this.endpointsToRPCCall.get(chainId);
      const newEndpointsToRPCCall = [];
      for await (const endpointToRPCCall of endpointsToRPCCall) {
        const endpointSuccessScores = await this.getEndpointToRPCSuccessRateCache(
          endpointToRPCCall,
        );
        endpointToRPCCall.callsStatistic = endpointSuccessScores.reduce(
          (previous: CallsStatistic, current: SuccessScore) => {
            if (current.value === EndpointsSuccessScore.fail) {
              previous.fail += 1;
            } else {
              previous.success += 1;
            }
            previous.successRating += current.value;
            return previous;
          },
          new CallsStatistic(),
        );
        newEndpointsToRPCCall.push(endpointToRPCCall);
      }
      this.endpointsToRPCCall.set(
        chainId,
        newEndpointsToRPCCall.sort((a: EndpointToRPCCall, b: EndpointToRPCCall) => {
          if ((a.endpointsEntity.priority = b.endpointsEntity.priority)) {
            return b.callsStatistic.successRating - a.callsStatistic.successRating;
          }
          return b.endpointsEntity.priority - a.endpointsEntity.priority;
        }),
      );
    }
  }

  public async updateFromDatabaseEndpointsToRPCCall(): Promise<any> {
    const endpointsToRPCCall: { [key: string]: EndpointToRPCCall[] } = {};
    let page = 0;
    const limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        page += 1;
        const endpoints = await this.endpointsRepository.getList(
          {
            page,
            limit,
            sortDirection: SortDirectionEnum.ASC,
            sortField: EndpointsSortFieldEnum.CHAIN_ID,
          },
          false,
        );
        if (endpoints.length === 0) {
          break;
        }
        endpoints.forEach((endpoint: EndpointEntity) => {
          const prevEndpoints: EndpointToRPCCall[] = this.endpointsToRPCCall.get(endpoint.chainId);
          const prevEndpoint = prevEndpoints?.find(
            (prevEndpoint: EndpointToRPCCall) => prevEndpoint.endpointsEntity.id === endpoint.id,
          );
          const callsStatistic = prevEndpoint ? prevEndpoint.callsStatistic : new CallsStatistic();
          const newEndpoint = { callsStatistic, endpointsEntity: endpoint };
          if (!endpointsToRPCCall[endpoint.chainId]) {
            endpointsToRPCCall[endpoint.chainId] = [newEndpoint];
          } else {
            endpointsToRPCCall[endpoint.chainId].push(newEndpoint);
          }
        });
      } catch (error) {
        this.logger.error(`Error to update Endpoints from Database ${error.message}`);
        return;
      }
    }
    const chainIds = this.endpointsToRPCCall.keys();
    for (const chainId of chainIds) {
      this.endpointsToRPCCall.delete(chainId);
    }
    Object.entries(endpointsToRPCCall).forEach(([chainId, endpointsToRPC]) =>
      this.endpointsToRPCCall.set(Number(chainId), endpointsToRPC),
    );
    await this.updateFromCacheAndSortEndpointsToRPCCallByPriorityAndSuccessRate();
  }

  private successRateCacheKey(endpointToRPCCall: EndpointToRPCCall): string {
    return `${endpointToRPCCall.endpointsEntity.chainId}${endpointToRPCCall.endpointsEntity.endpoint}`;
  }

  private filterEndpointSuccessScores(endpointSuccessScores: SuccessScore[]): SuccessScore[] {
    const now = Date.now();
    const endpointsSuccessRateTTL = this.configService.get('ENDPOINTS_SUCCESS_RATE_TTL');
    const endpointsSuccessRateMaxItemsNum = this.configService.get(
      'ENDPOINTS_SUCCESS_RATE_MAX_ITEMS_NUM',
    );
    return endpointSuccessScores.filter(
      (score: SuccessScore, index: number) =>
        index < endpointsSuccessRateMaxItemsNum - 1 &&
        now - score.timestamp < endpointsSuccessRateTTL,
    );
  }

  private async getEndpointToRPCSuccessRateCache(
    endpointToRPCCall: EndpointToRPCCall,
  ): Promise<SuccessScore[]> {
    const cacheKey = this.successRateCacheKey(endpointToRPCCall);
    const endpointSuccessScores: string = await this.cacheManager.get(cacheKey);
    return JSON.parse(endpointSuccessScores || '[]');
  }

  private async setEndpointToRPCSuccessRateCache(
    endpointToRPCCall: EndpointToRPCCall,
    successScores: SuccessScore[],
  ): Promise<void> {
    const endpointsSuccessRateHistoryTTL =
      (this.configService.get('ENDPOINTS_SUCCESS_RATE_HISTORY_TTL') || 24 * 60) * 1000;
    const cacheKey = this.successRateCacheKey(endpointToRPCCall);
    await this.cacheManager.set(cacheKey, JSON.stringify(successScores), {
      ttl: endpointsSuccessRateHistoryTTL,
    });
  }
}
