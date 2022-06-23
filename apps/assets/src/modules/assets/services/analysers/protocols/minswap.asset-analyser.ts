import BigNumber from 'bignumber.js';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { gql, normalizeDecimals } from '@app/common/utils';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import { CardanoBaseAssetAnalyser } from '../core/cardano-base.asset-analyser';
import {
  AssetPriceProvider,
  AssetPriceWithUnderlyingReserves,
  ComplexAsset,
} from '../core/price.provider';

@Injectable()
export class MinSwapAssetAnalyser
  extends CardanoBaseAssetAnalyser
  implements AssetAnalyser, AssetPriceProvider
{
  private readonly MIN_SWAP_ENDPOINT =
    'https://monorepo-mainnet-prod.minswap.org/graphql?AssetMetadata';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const token = await this.fetchAssetData(asset);
    if (!token) {
      return;
    }

    const [assetA, assetB] = token;
    return {
      decimals: 0,
      categories: [AssetCategory.MinSwapLP, AssetCategory.LpToken],
      underlying: [assetA.address, assetB.address],
    };
  }

  canHandleCategories(codes: string[]): boolean {
    return codes.includes(AssetCategory.MinSwapLP);
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    const $requests = assets.map((asset) => {
      const [currencySymbol, tokenName] = asset.address.split('.');
      return this.fetchLPToken(currencySymbol, tokenName);
    });

    const responseSettled = await Promise.allSettled($requests);

    const [data] = handlePromiseAllSettled(responseSettled);
    const availableAssets = data.flat(Infinity);
    const assetPriceWithUnderlyingReserves: AssetPriceWithUnderlyingReserves[] = [];

    for (const asset of assets) {
      const data = availableAssets.find((token) => {
        return this.joinCardanoAsset(token.lpAsset) === asset.address;
      });
      if (!data) continue;
      const [underlyingAssetA, underlyingAssetB] = asset.underlying;

      if (!underlyingAssetA?.price || !underlyingAssetB?.price) {
        assetPriceWithUnderlyingReserves.push({
          asset: { chainId, address: asset.address },
          price: null,
          reserves: [data.reserveA.toString(), data.reserveB.toString()],
        });
      } else {
        const assetAValue = new BigNumber(
          normalizeDecimals(data.reserveA, underlyingAssetA.decimals),
        ).times(underlyingAssetA.price);

        const assetBValue = new BigNumber(
          normalizeDecimals(data.reserveB, underlyingAssetB.decimals),
        ).times(underlyingAssetB.price);

        const totalValue = assetAValue.plus(assetBValue);
        const price = totalValue.div(normalizeDecimals(data.totalLiquidity, asset.decimals));

        assetPriceWithUnderlyingReserves.push({
          asset: { chainId, address: asset.address },
          price: price.toNumber(),
          reserves: [data.reserveA.toString(), data.reserveB.toString()],
        });
      }
    }
    return assetPriceWithUnderlyingReserves;
  }

  private async fetchAssetData(asset: AssetReference) {
    try {
      const [currencySymbol, tokenName] = asset.address.split('.');

      if (!currencySymbol || !tokenName)
        throw new Error('Invalid Cardano token address: ' + asset.address);

      const lpToken = await this.fetchLPToken(currencySymbol, tokenName);

      if (!lpToken[0]) return null;
      const { assetA, assetB } = lpToken[0];
      return [
        {
          address: assetA.currencySymbol ? this.joinCardanoAsset(assetA) : CARDANO_COIN_ADDRESS,
        },
        {
          address: this.joinCardanoAsset(assetB),
        },
      ];
    } catch (e) {
      this.logger.warn(
        `could not fetch token data, error: [${e.message}], analysis will be skipped`,
      );
      return null;
    }
  }

  private async fetchLPToken(currencySymbol: string, tokenName: string) {
    const body = {
      query: this.gqlQuery,
      variables: {
        lpAssets: [{ currencySymbol, tokenName }],
        fullyApply: false,
      },
    };
    const $data = this.httpService
      .post(this.MIN_SWAP_ENDPOINT, body)
      .pipe(map(({ data }) => data.data.poolsByLPAssets));

    const token = await firstValueFrom($data);
    return token;
  }

  private joinCardanoAsset({
    currencySymbol,
    tokenName,
  }: {
    currencySymbol: string;
    tokenName: string;
  }) {
    return [currencySymbol, tokenName].join('.');
  }

  private get gqlQuery(): string {
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

          lpAsset {
            currencySymbol
            tokenName
          }

          totalLiquidity
          reserveA
          reserveB
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
}
