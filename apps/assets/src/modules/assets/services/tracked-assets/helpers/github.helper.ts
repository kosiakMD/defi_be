import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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

  public async getFileNames(owner: string, repo: string, tree: string): Promise<string[]> {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.apiUrl}/repos/${owner}/${repo}/git/trees/${tree}`, {
        headers: this.headers,
      }),
    );
    return data.tree.map(({ path }) => path);
  }
}
