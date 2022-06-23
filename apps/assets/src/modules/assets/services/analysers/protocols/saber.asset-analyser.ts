import { StableSwap } from '@saberhq/stableswap-sdk';
import { Token, TokenAccountLayout, u64 } from '@saberhq/token-utils';
import * as web3 from '@solana/web3.js';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { decimalsDivider, toBN } from '@app/common/utils';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import {
  AssetPriceProvider,
  AssetPriceWithUnderlyingReserves,
  ComplexAsset,
} from '../core/price.provider';
import { SolanaBaseAssetAnalyser } from '../core/solana-base.asset-analyser';

// TODO: Use multicall
@Injectable()
export class SaberAssetAnalyser
  extends SolanaBaseAssetAnalyser
  implements AssetAnalyser, AssetPriceProvider
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3SolanaProviderService,
  ) {
    super();
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const connection = this.web3Provider.getInstanceByChainId(asset.chainId);
    let token;
    try {
      token = await StableSwap.load(connection, new web3.PublicKey(asset.address));
    } catch (e) {
      if (e.message.indexOf('Invalid owner') >= 0) {
        this.logger.warn(`SaberAssetAnalyser: error: ${e.message}`);
        return;
      }
    }
    if (!token) {
      return;
    }

    const { tokenA, tokenB, poolTokenMint } = token.state;
    const { name, symbol, decimals } = await Token.load(connection, poolTokenMint);

    return {
      name,
      symbol,
      decimals,
      categories: [AssetCategory.SaberLP, AssetCategory.LpToken],
      underlying: [tokenA.mint.toString(), tokenB.mint.toString()],
    };
  }

  canHandleCategories(codes: string[]): boolean {
    return codes.includes(AssetCategory.SaberLP);
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    const promises = assets.map((asset) => this.calculatePrice(chainId, asset));
    return await Promise.all(promises);
  }

  private async calculatePrice(
    chainId: number,
    asset: ComplexAsset,
  ): Promise<AssetPriceWithUnderlyingReserves> {
    const connection = this.web3Provider.getInstanceByChainId(chainId);
    const token = await StableSwap.load(connection, new web3.PublicKey(asset.address));

    const { tokenA, tokenB, poolTokenMint } = token.state;
    const [reserveA, reserveB, supply] = await Promise.all([
      connection.getAccountInfo(tokenA.reserve),
      connection.getAccountInfo(tokenB.reserve),
      await connection.getTokenSupply(poolTokenMint),
    ]);

    const reserveAAmount = u64.fromBuffer(TokenAccountLayout.decode(reserveA.data).amount);
    const reserveBAmount = u64.fromBuffer(TokenAccountLayout.decode(reserveB.data).amount);

    const [underlyingAssetA, underlyingAssetB] = asset.underlying;

    if (!underlyingAssetA?.price || !underlyingAssetB?.price) {
      return {
        asset: { chainId, address: asset.address },
        price: null,
        reserves: [reserveAAmount.toString(), reserveBAmount.toString()],
      };
    }

    const assetAValue = toBN(reserveAAmount.toString())
      .dividedBy(decimalsDivider(underlyingAssetA.decimals))
      .multipliedBy(underlyingAssetA.price);

    const assetBValue = toBN(reserveBAmount.toString())
      .dividedBy(decimalsDivider(underlyingAssetB.decimals))
      .multipliedBy(underlyingAssetB.price);

    const totalValue = assetAValue.plus(assetBValue);
    const price = totalValue
      .multipliedBy(decimalsDivider(asset.decimals))
      .dividedBy(toBN(supply.value.amount));

    return {
      asset: { chainId, address: asset.address },
      price: price.toNumber(),
      reserves: [reserveAAmount.toString(), reserveBAmount.toString()],
    };
  }
}
