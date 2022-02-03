import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectsEntity } from '../entities/projects.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectsEntity)
    private repository: Repository<ProjectsEntity>,
  ) {}

  async findByCode(code: string): Promise<ProjectsEntity> {
    return this.repository.findOne({
      where: { code: code },
      relations: ['features'],
    });
  }
}
