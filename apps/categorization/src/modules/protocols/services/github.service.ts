import { series } from 'async';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { GithubFileDto, GithubTreeItemDto } from '../interfaces/github.interfaces';

@Injectable()
export class GithubService {
  readonly apiUrl = 'https://api.github.com';
  readonly headers: object;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const authToken = configService.get('GITHUB_OAUTH_TOKEN');
    if (authToken) {
      this.headers = {
        Authorization: `token ${authToken}`,
      };
    }
  }

  async getFilesByExtensions(url: string, extensions: string[]): Promise<GithubFileDto[]> {
    this.logger.debug(
      `getFilesByExtensionsRecursively for url: [${url}], using extensions: ${extensions}`,
    );
    const [, , , owner, repo] = url.split('/');
    if (!owner || !repo) {
      this.logger.warn(`unable to extract "owner" and/or "repo" from github url: [${url}]`);
      return [];
    }
    const latestMasterSha = await this.getLatestCommitSha(owner, repo);
    const scanResults = await this.scanRepoForFilesWithExtensions(
      owner,
      repo,
      latestMasterSha,
      extensions,
    );
    return scanResults.flat(Infinity);
  }

  private async getLatestCommitSha(owner: string, repo: string, branch = 'master') {
    const info = await this.request(`${this.apiUrl}/repos/${owner}/${repo}/branches/${branch}`);
    return info.data.commit.sha;
  }

  private async scanRepoForFilesWithExtensions(
    owner: string,
    repo: string,
    tree: string,
    extensions: string[],
    rootPath = '',
  ): Promise<GithubFileDto[]> {
    this.logger.debug(`getting tree items by sha: [${tree}]`);
    const treeItems = await this.getTreeItems(owner, repo, tree);
    return series(
      treeItems.map(({ path, sha, type }) => async () => {
        //one of the file we are looking for
        if (type === 'blob' && extensions.some((ext) => path.endsWith(ext))) {
          this.logger.debug(`found the file: [${path}]`);
          return this.getContent(owner, repo, `${rootPath}/${path}`);
        }

        //it's a folder, scan it recursively for the interesting files
        if (type === 'tree') {
          return this.scanRepoForFilesWithExtensions(
            owner,
            repo,
            sha,
            extensions,
            `${rootPath}/${path}`,
          );
        }

        //file is not interested, skip it and return ampty array to be filtered out later
        return [];
      }),
    );
  }

  private async getTreeItems(
    owner: string,
    repo: string,
    tree: string,
  ): Promise<GithubTreeItemDto[]> {
    const info = await this.request(`${this.apiUrl}/repos/${owner}/${repo}/git/trees/${tree}`);
    return info.data.tree.map(({ path, sha, type }) => ({ path, sha, type }));
  }

  private async getContent(owner: string, repo: string, path: string): Promise<GithubFileDto> {
    const info = await this.request(`${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`);
    const content = await firstValueFrom(this.httpService.get(info.data.download_url));
    return {
      path: info.data.path,
      downloadUrl: info.data.download_url,
      content: content.data,
    };
  }

  private async request(url: string) {
    try {
      return await firstValueFrom(this.httpService.get(url, { headers: this.headers }));
    } catch (e) {
      if (e.message === 'Request failed with status code 403') {
        this.logger.log('request to github failed: rate limit exceeded, wait for unblocking');
        const rateLimitInfo = await firstValueFrom(
          this.httpService.get(`${this.apiUrl}/rate_limit`, { headers: this.headers }),
        );
        const delay = rateLimitInfo.data.rate.reset * 1000 - Date.now();
        this.logger.log(`going to wait for ${delay} ms...`);
        await new Promise((res) => setTimeout(res, delay));
        this.logger.debug('retrying request after sleeping...');
        return this.request(url);
      }
      //re-throw unexpected error
      throw e;
    }
  }
}
