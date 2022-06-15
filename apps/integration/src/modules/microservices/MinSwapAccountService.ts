import { Address, ChainIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { DetailedResponseDto } from '@app/common/dto';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { chunk, gql } from '@app/common/utils';

import { Asset } from '../../common/interfaces/transactions.interfaces';

import { AccountService } from './account.service';

export class MinSwapAccountService extends AccountService {
  async getAssets(
    addresses: Address[],
    chainIds?: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    const addressMap = new Map(addresses.map((address) => [address.replace('.', ''), address]));
    const keys = Array.from(addressMap.keys());
    const cacheKey = `getAssets_${keys.join(',')}_${chainIds.join(',')}`;
    const endpoint = 'https://monorepo-mainnet-prod.minswap.org/graphql';
    const minSwapFromLpEndpoint = endpoint + '?PoolsByLPAssets';
    const minSwapPureAssetEndpoint = endpoint + '?AssetMetadata';

    return this.getOrSet(this.cacheTTLInSeconds, cacheKey, async () => {
      const dataArray = await Promise.allSettled(
        chunk(addresses, 20).map(async (addressChunk) => {
          const lpAssets = addressChunk
            .filter((x) => x !== CARDANO_COIN_ADDRESS)
            .map((address) => {
              const [currencySymbol, tokenName] = address.split('.');
              return { currencySymbol, tokenName };
            });

          const [$lpAssets, $pureAssets] = await Promise.all([
            this.lpAssetsRequest(minSwapFromLpEndpoint, lpAssets),
            this.pureAssetRequest(minSwapPureAssetEndpoint, lpAssets),
          ]);

          const lpAssetsData = $lpAssets.data
            .filter((lpToken) => lpToken.assetB.metadata !== null)
            .map((lpToken) => {
              const lpSymbol =
                lpToken.assetB.metadata.ticker + '/' + (lpToken.assetA?.metadata?.ticker || 'ADA');
              return {
                chainId: chainIds[0],
                isLp: true,
                isTracked: false,
                address: lpToken.lpAsset.currencySymbol + '.' + lpToken.lpAsset.tokenName,
                name: 'LP ' + lpSymbol,
                symbol: lpSymbol,
                decimals: 0,
                totalSupply: lpToken.totalLiquidity,
                underlyingAssets: [
                  {
                    chainId: chainIds[0],
                    isLp: false,
                    address: lpToken.assetB.currencySymbol + '.' + lpToken.assetB.tokenName,
                    name: lpToken.assetB.metadata.name,
                    symbol: lpToken.assetB.metadata.ticker,
                    decimals: lpToken.assetB.metadata.decimals,
                    totalSupply: lpToken.reserveB,
                  },
                  {
                    chainId: chainIds[0],
                    isLp: false,
                    address: lpToken.assetA.currencySymbol
                      ? lpToken.assetA.currencySymbol + '.' + lpToken.assetA.tokenName
                      : CARDANO_COIN_ADDRESS,
                    name: lpToken.assetA.metadata?.name || 'ADA',
                    symbol: lpToken.assetA.metadata?.ticker || 'ADA',
                    decimals: lpToken.assetA.metadata?.decimals || 6,
                    totalSupply: lpToken.reserveA,
                  },
                ],
              };
            });

          const assetsPureData = $pureAssets.data
            .filter((asset) => asset.metadata !== null)
            .map((asset) => {
              return {
                chainId: chainIds[0],
                isLp: false,
                isTracked: true,
                address: asset.currencySymbol + '.' + asset.tokenName,
                name: asset.metadata.name,
                symbol: asset.metadata?.ticker || asset.metadata?.name,
                decimals: asset.metadata.decimals,
                underlyingAssets: [],
              };
            });

          return {
            errors: [] //
              .concat($lpAssets.errors)
              .concat($pureAssets.errors)
              .filter(Boolean),
            data: lpAssetsData.concat(assetsPureData),
          } as unknown as any;
        }),
      );

      const [data, errors] = handlePromiseAllSettled(dataArray);

      const response = data.reduce(
        (acc, cur) => {
          acc.errors.push(...(cur?.errors || []));
          acc.data.push(...cur.data);
          return acc;
        },
        { errors: [], data: [] },
      );
      response.errors.push(...errors);
      response.data.push({
        chainId: 22,
        isLp: false,
        isTracked: true,
        address: CARDANO_COIN_ADDRESS,
        name: 'ADA',
        symbol: 'ADA',
        decimals: 6,
        underlyingAssets: [],
      });
      return response;
    });
  }

  get minswapFromLpQuery(): string {
    return gql`
      query PoolsByLPAssets($lpAssets: [InputAsset!]!, $fullyApply: Boolean) {
        poolsByLPAssets(lpAssets: $lpAssets, fullyApply: $fullyApply) {
          assetA {
            currencySymbol
            tokenName
            ...allMetadata
          }
          assetB {
            currencySymbol
            tokenName
            ...allMetadata
          }
          reserveA
          reserveB
          lpAsset {
            currencySymbol
            tokenName
          }
          totalLiquidity
        }
      }

      fragment allMetadata on Asset {
        metadata {
          name
          ticker
          decimals
        }
      }
    `;
  }

  get minswapPureAssetQuery(): string {
    return gql`
      query AssetMetadata($inputs: [AssetMetadataInput!]!) {
        assetMetadata(inputs: $inputs) {
          currencySymbol
          tokenName
          ...allMetadata
        }
      }

      fragment allMetadata on Asset {
        metadata {
          name
          ticker
          url
          decimals
        }
      }
    `;
  }

  private async lpAssetsRequest(endpoint: string, lpAssets: Array<any>): Promise<any> {
    const $lpAssets = await this.httpService
      .post(endpoint, {
        query: this.minswapFromLpQuery,
        variables: { lpAssets, fullyApply: false },
      })
      .toPromise();

    const response = {
      ...$lpAssets.data,
      data: $lpAssets.data.data.poolsByLPAssets,
    };

    return response;
  }

  private async pureAssetRequest(endpoint: string, lpAssets: Array<any>): Promise<any> {
    const $pureAssets = await this.httpService
      .post(endpoint, {
        query: this.minswapPureAssetQuery,
        variables: { inputs: lpAssets },
      })
      .toPromise();
    const response = {
      ...$pureAssets.data,
      data: $pureAssets.data.data.assetMetadata,
    };
    return response;
  }
}
