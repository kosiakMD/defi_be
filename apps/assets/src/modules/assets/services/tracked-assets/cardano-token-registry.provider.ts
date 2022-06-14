import { eachLimit } from 'async';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { GithubService } from './helpers/github.helper';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class CardanoTokenRegistryProvider implements TrackedAssetsProvider {
  private readonly githubOwner = 'cardano-foundation';
  private readonly githubRepo = 'cardano-token-registry';
  private readonly mappingsPath = 'mappings';

  private readonly FORMAT_ADDRESSES_PARALLEL_LIMIT = 2;

  private readonly metaBaseUrl = 'https://tokens.cardano.org/metadata/';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly githubService: GithubService,
  ) {}

  name() {
    return 'CardanoTokenRegistry';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const addresses = await this.getAddresses();
    this.logger.debug(`found [${addresses.length}] cardano assets, formatting...`);
    return this.formatAddresses(addresses);
  }

  private async formatAddresses(addresses: string[]): Promise<AssetProcessingRequest[]> {
    const formatted: AssetProcessingRequest[] = [];
    let count = 0;
    await eachLimit(addresses, this.FORMAT_ADDRESSES_PARALLEL_LIMIT, async (address) => {
      count++;
      const { data } = await this.getAddressMeta(address);
      if (data?.ticker && data?.name) {
        const formattedAddress = this.formatAddress(address, data.ticker.value, data.name.value);
        if (address) {
          formatted.push({
            chainId: ChainIdEnum.cardano,
            address: formattedAddress,
          });
        }
      }
      if (count % 50 === 0) {
        this.logger.debug(`formatted [${count}] cardano assets`);
      }
    });
    this.logger.debug(`selected [${formatted.length}] cardano assets`);
    return formatted;
  }

  private async getAddressMeta(address: string) {
    try {
      return await firstValueFrom(this.httpService.get(`${this.metaBaseUrl}${address}`));
    } catch (e) {
      return { data: {} };
    }
  }

  private formatAddress(address: string, symbol: string, name: string): string {
    return this.tryFormat(address, symbol) || this.tryFormat(address, name);
  }

  private tryFormat(address: string, byValue: string): string | undefined {
    const byValueHex = Buffer.from(byValue, 'utf8').toString('hex');
    const index = address.indexOf(byValueHex);
    if (index > 0) {
      return [address.slice(0, index), address.slice(index)].join('.');
    }
  }

  private async getAddresses(): Promise<string[]> {
    const latestCommitSha = await this.githubService.getLatestCommitSha(
      this.githubOwner,
      this.githubRepo,
    );
    const nodes = await this.githubService.getTreeItems(
      this.githubOwner,
      this.githubRepo,
      latestCommitSha,
    );
    const mappingNode = nodes.find(({ path }) => path === this.mappingsPath);
    const listOfAssetsFiles = await this.githubService.getTreeItems(
      this.githubOwner,
      this.githubRepo,
      mappingNode.sha,
    );
    return listOfAssetsFiles.map(({ path }) => path.replace('.json', ''));
  }
}
