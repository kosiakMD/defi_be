import { CallsStatistic } from 'apps/rpc/src/common/dto/CallsStatistic.dto';

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId } from '@app/common';
import { Logger } from '@app/common/Logger';

import { ListQueryDto } from '../../../common/dto/ListQuery.dto';

import { EndpointCreateDto } from '../dto/endpoint.create.dto';
import { EndpointUpdateDto } from '../dto/endpoint.update.dto';
import { EndpointsListDto } from '../dto/endpoints.list.dto';
import { EndpointEntity } from '../endpoint.entity';
import { EndpointsRepository } from '../endpoints.repository';
import { EndpointStatistic } from '../endpoints.types';
import { EndpointsStatisticService } from './endpoints-statistic.service';

@Injectable()
export class EndpointsService {
  constructor(
    @InjectRepository(EndpointsRepository)
    private readonly endpointsRepository: EndpointsRepository,
    private readonly endpointsStatisticService: EndpointsStatisticService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async getEndpointsList(query: ListQueryDto): Promise<EndpointsListDto> {
    const endpoints = await this.endpointsRepository.getList(query);
    const endpointsMap = await this.endpointsStatisticService.getEndpointsMap();
    const items = endpoints.map((endpoint) => {
      const callsStatistic = this.getEndpointStatisticFromMap(endpointsMap, endpoint);
      return Object.assign(endpoint, { callsStatistic });
    });
    return { items };
  }

  async getEndpointById(endpointId: number): Promise<EndpointEntity> {
    const endpoint = await this.endpointsRepository.findById(endpointId);
    if (!endpoint) {
      throw new Error(`Not found! endpoint id: ${endpointId}`);
    }
    const endpointsMap = await this.endpointsStatisticService.getEndpointsMap();
    const callsStatistic = this.getEndpointStatisticFromMap(endpointsMap, endpoint);
    return Object.assign(endpoint, { callsStatistic });
  }

  async createEndpoint(newEndpoint: EndpointCreateDto): Promise<EndpointEntity> {
    return this.endpointsRepository.insertOne(newEndpoint);
  }

  async updateEndpoint(
    endpointId: number,
    endpointUpdates: EndpointUpdateDto,
  ): Promise<EndpointEntity> {
    return this.endpointsRepository.updateItem(endpointId, endpointUpdates);
  }

  async deleteEndpoint(endpointId: number): Promise<void> {
    await this.endpointsRepository.deleteItem(endpointId);
  }

  private getEndpointStatisticFromMap(
    endpointsToRPCCall: Map<ChainId, EndpointStatistic[]>,
    endpoint: EndpointEntity,
  ): CallsStatistic {
    const chainEndpoints = endpointsToRPCCall.get(endpoint.chainId) || [];
    const endpointStatistic = chainEndpoints.find(
      (endpointToRPCCall) => endpointToRPCCall.endpoint.id === endpoint.id,
    );
    return endpointStatistic?.callsStatistic;
  }
}
