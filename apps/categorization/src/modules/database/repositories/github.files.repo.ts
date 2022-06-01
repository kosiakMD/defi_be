import { EntityRepository, Repository } from 'typeorm';

import { GithubFile } from '../entities/github.file.entity';

@EntityRepository(GithubFile)
export class GithubFilesRepository extends Repository<GithubFile> {}
