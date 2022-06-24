import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';

import { AssetReference } from '../../../../../common/types';

import { CosmosHelper } from '../../helpers/cosmos.helper';
import { GithubService } from '../../helpers/github.helper';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

type CurrencyData = {
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
  coinGeckoId: string;
};

@Injectable()
export class CosmosAssetAnalyser implements AssetAnalyser {
  private readonly githubOwner = 'osmosis-labs';
  private readonly githubRepo = 'osmosis-frontend';
  private readonly githubFilePath = 'packages/web/config/chain-infos.ts';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly githubService: GithubService,
    private readonly cosmosHelper: CosmosHelper,
    private readonly cache: CacheService,
  ) {}

  name() {
    return 'CosmosAssetAnalyser';
  }

  canAnalyseAsset({ chainId }: AssetReference): boolean {
    return [ChainIdEnum.cosmos, ChainIdEnum.kava, ChainIdEnum.osmosis, ChainIdEnum.secret].includes(
      chainId,
    );
  }

  async analyseAsset({ address, chainId }: AssetReference): Promise<AssetAnalysisResult> {
    const url = this.cosmosHelper.chainUrlMap.get(chainId);
    if (!url) {
      return null;
    }

    const denomMappings = await this.getDenomMappings(url);
    const denom = denomMappings.find((dm) => dm.address === address);
    if (!denom) {
      return null;
    }

    const { baseDenom } = denom;
    const chainInfos = await this.getChainInfos();
    const chainInfo = chainInfos.find(({ coinMinimalDenom }) => coinMinimalDenom === baseDenom);
    if (!chainInfo) {
      return null;
    }

    const result = {
      symbol: chainInfo.coinDenom,
      decimals: chainInfo.coinDecimals,
      metadata: {},
    };

    if (chainInfo.coinGeckoId && !chainInfo.coinGeckoId.startsWith('pool:')) {
      result.metadata = {
        coingeckoId: chainInfo.coinGeckoId,
      };
    }
    return result;
  }

  async getDenomMappings(url: string): Promise<{ baseDenom: string; address: string }[]> {
    return this.cache.getOrLoad(
      osmosisApiRequestCacheKey(url),
      async () => {
        const { data } = await firstValueFrom(this.httpService.get(`${url}`));
        return data.denom_traces.map((denom) => ({
          baseDenom: denom.base_denom,
          address: this.cosmosHelper.transformDenomToHash(denom),
        }));
      },
      { ttl: 60 * 60 /* 1 hour in seconds */ },
    );
  }

  /**
   * It reads content of the .ts file from github: https://github.com/osmosis-labs/osmosis-frontend/blob/e7caeca7ea21f0f2dc0bdbfbedacadc8eb898916/packages/web/config/chain-infos.ts
   * Then it parses the file by selecting currencies data.
   * Here is small part which is parsed:
   *     {
   *       rpc: "https://rpc-osmosis.keplr.app/", // test: "http://rpc-test.osmosis.zone/"
   *       rest: "https://lcd-osmosis.keplr.app/", // test: "http://lcd-test.osmosis.zone/"
   *       chainId: "osmosis-1", // test: "osmo-test-4"
   *       chainName: "Osmosis",
   *       bip44: {
   *         coinType: 118,
   *       },
   *       bech32Config: Bech32Address.defaultBech32Config('osmo'),
   *       currencies: [
   *         {
   *           coinDenom: "OSMO",
   *           coinMinimalDenom: "uosmo",
   *           coinDecimals: 6,
   *           coinGeckoId: "osmosis",
   *           coinImageUrl: "/tokens/osmo.svg",
   *           isStakeCurrency: true,
   *           isFeeCurrency: true,
   *         },
   *         {
   *           coinDenom: "ION",
   *           coinMinimalDenom: "uion",
   *           coinDecimals: 6,
   *           coinGeckoId: "ion",
   *           coinImageUrl: "/tokens/ion.png",
   *         },
   *       ],
   *       gasPriceStep: {
   *         low: 0,
   *         average: 0,
   *         high: 0.025,
   *       },
   *       features: ["stargate", "ibc-transfer", "no-legacy-stdTx", "ibc-go"],
   *       explorerUrlToTx: "https://www.mintscan.io/osmosis/txs/{txHash}",
   *     },
   */
  private async getChainInfos(): Promise<CurrencyData[]> {
    const chainInfosFileContent = await this.githubService.getFileContent(
      this.githubOwner,
      this.githubRepo,
      this.githubFilePath,
    );
    return chainInfosFileContent
      .replace(/[\r\n ]/gm, '')
      .match(/currencies:\[(.+?)]/g)
      .flatMap((currencies) =>
        currencies
          .match(/{(.+?)}/g)
          .map((curr) => curr.substring(1, curr.length - 2).replace(/["]/g, '')),
      )
      .map((currencyFields) =>
        currencyFields.split(',').reduce((data, item) => {
          const [key, ...valueParts] = item.split(':');
          data[key] = valueParts.join(':');
          return data;
        }, {} as CurrencyData),
      );
  }
}

const osmosisApiRequestCacheKey = (url: string) => {
  return url;
};
