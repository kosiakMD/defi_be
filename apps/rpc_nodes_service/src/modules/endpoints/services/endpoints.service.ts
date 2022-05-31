import { CallsStatistic } from 'apps/rpc_nodes_service/src/common/dto/calls-statistic.dto';

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/logger';

import { ListQueryDto } from '../../../common/dto/list-query.dto';

import { EndpointCreateDto } from '../dto/endpoint.create.dto';
import { EndpointUpdateDto } from '../dto/endpoint.update.dto';
import { EndpointsListDto } from '../dto/endpoints.list.dto';
import { EndpointEntity } from '../endpoint.entity';
import { EndpointsRepository } from '../endpoints.repository';
import { EndpointToRPCCall } from '../endpoints.types';
import { EndpointsToRPCCallService } from './endpoints-to-rpc-call.service';

@Injectable()
export class EndpointsService {
  constructor(
    @InjectRepository(EndpointsRepository)
    private readonly endpointsRepository: EndpointsRepository,
    private readonly endpointsToRPCCallService: EndpointsToRPCCallService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async getEndpointsList(query: ListQueryDto): Promise<EndpointsListDto> {
    const endpoints = await this.endpointsRepository.getList(query);
    const endpointsToRPCCall = await this.endpointsToRPCCallService.getAllEndpointsToRPCCall();
    const items = endpoints.map((endpoint) => {
      const callsStatistic = this.getEndpointSuccessRateFromEndpointsToRPCCall(
        endpoint,
        endpointsToRPCCall,
      );
      return Object.assign(endpoint, { callsStatistic });
    });
    return { items };
  }

  async getEndpointById(endpointId: number): Promise<EndpointEntity> {
    const endpoint = await this.endpointsRepository.findById(endpointId);
    if (!endpoint) {
      throw new Error(`Not found! endpoint id: ${endpointId}`);
    }
    const endpointsToRPCCall = await this.endpointsToRPCCallService.getAllEndpointsToRPCCall();
    const callsStatistic = this.getEndpointSuccessRateFromEndpointsToRPCCall(
      endpoint,
      endpointsToRPCCall,
    );
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

  private getEndpointSuccessRateFromEndpointsToRPCCall(
    endpoint: EndpointEntity,
    endpointsToRPCCall: Map<number, EndpointToRPCCall[]>,
  ): CallsStatistic {
    let callsStatistic = new CallsStatistic();
    const endpointToRPCCall = (endpointsToRPCCall.get(endpoint.chainId) || []).find(
      (endpointToRPCCall) => endpointToRPCCall.endpointsEntity.id === endpoint.id,
    );
    if (endpointToRPCCall) {
      callsStatistic = endpointToRPCCall.callsStatistic;
    } else {
      this.logger.warn(`No cached endpoint id: ${endpoint.id} to get success rate!`);
    }
    return callsStatistic;
  }
}
