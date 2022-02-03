import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';

import { ListQueryDto } from '../../../common/dto/ListQuery.dto';

import { EndpointCreateDto } from '../dto/endpoint.create.dto';
import { EndpointUpdateDto } from '../dto/endpoint.update.dto';
import { EndpointsListDto } from '../dto/endpoints.list.dto';
import { EndpointsEntity } from '../endpoints.entity';
import { EndpointsRepository } from '../endpoints.repository';

@Injectable()
export class EndpointsService {
  constructor(
    @InjectRepository(EndpointsRepository)
    private readonly endpointsRepository: EndpointsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async getEndpointsList(query: ListQueryDto): Promise<EndpointsListDto> {
    return { items: await this.endpointsRepository.getList(query) };
  }

  async getEndpointById(endpointId: number): Promise<EndpointsEntity> {
    return this.endpointsRepository.findById(endpointId);
  }

  async createEndpoint(newEndpoint: EndpointCreateDto): Promise<EndpointsEntity> {
    return this.endpointsRepository.insertOne(newEndpoint);
  }

  async updateEndpoint(
    endpointId: number,
    endpointUpdates: EndpointUpdateDto,
  ): Promise<EndpointsEntity> {
    return this.endpointsRepository.updateItem(endpointId, endpointUpdates);
  }

  async deleteEndpoint(endpointId: number): Promise<void> {
    await this.endpointsRepository.deleteItem(endpointId);
  }
}
