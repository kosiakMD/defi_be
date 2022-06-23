import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { SolanaChains } from '@app/common/constant/solana.chains';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

type TokenListResponse = {
  tokens: [
    {
      address: string;
      chainId: number;
    },
  ];
};

@Injectable()
export class SolanaLabsAssetsProvider implements TrackedAssetsProvider {
  private readonly url =
    'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  name() {
    return 'SolanaLabsAssetsProvider';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const { data: tokenList } = await firstValueFrom(
      this.httpService.get<TokenListResponse>(`${this.url}`),
    );
    const requests: AssetProcessingRequest[] = [];
    tokenList.tokens.forEach(({ address, chainId }) => {
      if (chainId === SolanaChains.MainnetBeta) {
        requests.push({
          address,
          chainId: ChainIdEnum.sol,
        });
      }
    });
    return requests;
  }
}
