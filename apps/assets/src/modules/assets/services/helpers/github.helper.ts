import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';

@Injectable()
export class GithubService {
  readonly apiUrl = 'https://api.github.com';
  readonly headers: object;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cache: CacheService,
  ) {
    const authToken = configService.get('GITHUB_OAUTH_TOKEN');
    if (authToken) {
      this.headers = {
        Authorization: `token ${authToken}`,
      };
    }
  }

  async getLatestCommitSha(owner: string, repo: string, branch = 'master') {
    return this.cache.getOrLoad(
      getLatestCommitShaCacheKey(owner, repo, branch),
      async () => {
        const { data } = await this.request(
          `${this.apiUrl}/repos/${owner}/${repo}/branches/${branch}`,
        );
        return data.commit.sha;
      },
      { ttl: 60 * 60 /* 1 hour in seconds */ },
    );
  }

  async getTreeItems(
    owner: string,
    repo: string,
    tree: string,
  ): Promise<
    {
      path: string;
      sha: string;
      type: string;
    }[]
  > {
    return this.cache.getOrLoad(
      getTreeItemsCacheKey(owner, repo, tree),
      async () => {
        const { data } = await this.request(
          `${this.apiUrl}/repos/${owner}/${repo}/git/trees/${tree}`,
        );
        return data.tree.map(({ path, sha, type }) => ({ path, sha, type }));
      },
      { ttl: 60 * 60 /* 1 hour in seconds */ },
    );
  }

  public async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    return this.cache.getOrLoad(
      getFileContentCacheKey(owner, repo, path),
      async () => {
        const { data } = await this.request(
          `${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`,
        );
        return Buffer.from(data.content, 'base64').toString();
      },
      { ttl: 60 * 60 /* 1 hour in seconds */ },
    );
  }

  private async request(url: string) {
    return firstValueFrom(this.httpService.get(url, { headers: this.headers }));
  }
}

const getTreeItemsCacheKey = (owner: string, repo: string, tree: string): string => {
  return `${owner}/${repo}/git/trees/${tree}`;
};

const getLatestCommitShaCacheKey = (owner: string, repo: string, branch: string): string => {
  return `${owner}/${repo}/git/branches/${branch}`;
};

const getFileContentCacheKey = (owner: string, repo: string, path: string): string => {
  return `${owner}/${repo}/contents/${path}`;
};
