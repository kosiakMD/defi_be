import { EntityRepository, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { ListQueryDto } from '../../common/dto/ListQuery.dto';

import { EndpointCreateDto } from './dto/endpoint.create.dto';
import { EndpointUpdateDto } from './dto/endpoint.update.dto';
import { EndpointEntity } from './endpoint.entity';

@Injectable()
@EntityRepository(EndpointEntity)
export class EndpointsRepository extends Repository<EndpointEntity> {
  async getList(queryParams: ListQueryDto, getAll = true): Promise<EndpointEntity[]> {
    const { limit, page, sortDirection, sortField } = queryParams;
    const queryBuilder = this.createQueryBuilder('public.endpoints');
    if (!getAll) {
      queryBuilder.where('is_enabled IS TRUE');
    }
    queryBuilder
      .offset((page - 1) * limit) //
      .limit(limit)
      .orderBy(sortField, sortDirection);
    return queryBuilder.getMany();
  }

  async findById(endpointId: number): Promise<EndpointEntity> {
    return this.findOne({ id: endpointId });
  }

  async insertOne(endpointData: EndpointCreateDto): Promise<EndpointEntity> {
    const { endpoint, chainId } = endpointData;
    const existenEndpoint = await this.findOne({ where: [{ endpoint, chainId }] });
    if (existenEndpoint) {
      throw Error(`Endpoint '${endpoint}' exists on chainId '${chainId}'`);
    }
    return this.save(endpointData);
  }

  async updateItem(id: number, updates: EndpointUpdateDto): Promise<EndpointEntity> {
    await this.update(id, updates);
    return this.findById(id);
  }

  async deleteItem(id: number): Promise<void> {
    await this.delete(id);
  }
}
