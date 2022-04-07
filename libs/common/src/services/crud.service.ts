import { DeepPartial, FindConditions, FindManyOptions, Repository, UpdateResult } from 'typeorm';

import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';

type DP<T> = DeepPartial<T>;

@Injectable()
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export abstract class CrudService<T> {
  protected constructor(private readonly entityRepository: Repository<DP<T>> | any) {}

  public async getAll(conditions?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.entityRepository.find(conditions);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async get(conditions: FindConditions<T>): Promise<T> {
    try {
      return await this.entityRepository.findOne(conditions);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async getOneOrFail(conditions: FindConditions<T>): Promise<T> {
    try {
      return await this.entityRepository.findOneOrFail(conditions);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async create(projection): Promise<any> {
    try {
      const entity = this.entityRepository.create(projection);
      return await this.entityRepository.save(entity);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async patch(conditions, projection): Promise<UpdateResult> {
    try {
      const entity = await this.entityRepository.findOne(conditions);
      if (!entity) {
        throw new NotFoundException();
      }

      return await this.entityRepository.update(conditions, projection);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async deleteOne(conditions): Promise<void> {
    try {
      await this.entityRepository.delete(conditions);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async deactivateOne(conditions) {
    try {
      const entity = await this.entityRepository.findOne(conditions);
      if (!entity) {
        throw new NotFoundException();
      }

      await this.entityRepository.update(conditions, {
        isActive: false,
      } as any);
    } catch (e: any) {
      throw new HttpException(e.message, e.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
