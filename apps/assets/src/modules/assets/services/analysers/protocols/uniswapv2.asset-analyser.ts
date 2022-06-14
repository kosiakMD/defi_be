import { AbiItem } from 'web3-utils';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '@app/common/dto/CallData';
import { decimalsDivider, toBN } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UNIV2LP_ABI } from '../../../../../common/abis/univ2-lp.abi';
import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';
import { AssetPrice, AssetPriceProvider, ComplexAsset } from '../core/price.provider';

// TODO: Fix error crash here
@Injectable()
export class UniswapV2AssetAnalyser
  extends EVMAssetAnalyser
  implements AssetAnalyser, AssetPriceProvider
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const response = await this.fetchAssetData(asset);
    if (!response || response.some((value) => !value)) {
      return;
    }

    const [token0, token1, factory] = response;
    return {
      categories: [AssetCategory.UniSwapV2LikeLP, AssetCategory.LpToken],
      underlying: [token0, token1],
      metadata: {
        factory,
      },
    };
  }

  canHandleCategory(code: string): boolean {
    return code === AssetCategory.UniSwapV2LikeLP;
  }

  async getPrices(chainId: number, assets: ComplexAsset[]): Promise<AssetPrice[]> {
    const getReservesAbi: AbiItem = this.findAbiItem(UNIV2LP_ABI, 'getReserves');
    const totalSupplyAbi: AbiItem = this.findAbiItem(UNIV2LP_ABI, 'totalSupply');

    const calls = assets.reduce((all, asset) => {
      const contract = new DynamicContract(asset.address);
      return all.concat([contract.createCall(getReservesAbi), contract.createCall(totalSupplyAbi)]);
    }, new Array<CallData>());

    const responses = await this.multicall.callArray(calls, chainId);

    const prices: AssetPrice[] = [];

    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const [asset0, asset1] = asset.underlying;
      const { _reserve0, _reserve1 } = responses[2 * index];
      const totalSupply = responses[2 * index + 1];

      const asset0Value = toBN(_reserve0)
        .dividedBy(decimalsDivider(asset0.decimals))
        .multipliedBy(asset0.price);

      const asset1Value = toBN(_reserve1)
        .dividedBy(decimalsDivider(asset1.decimals))
        .multipliedBy(asset1.price);

      const totalValue = asset0Value.plus(asset1Value);
      const price = totalValue.multipliedBy(decimalsDivider(asset.decimals)).dividedBy(totalSupply);

      prices.push({
        asset: { chainId, address: asset.address },
        price: price.toNumber(),
      });
    }

    return prices;
  }

  private async fetchAssetData(asset: AssetReference) {
    const token0Abi: AbiItem = this.findAbiItem(UNIV2LP_ABI, 'token0');
    const token1Abi: AbiItem = this.findAbiItem(UNIV2LP_ABI, 'token1');
    const factoryAbi: AbiItem = this.findAbiItem(UNIV2LP_ABI, 'factory');

    const contract = new DynamicContract(asset.address);
    try {
      return await this.multicall.callArray(
        [
          contract.createCall(token0Abi),
          contract.createCall(token1Abi),
          contract.createCall(factoryAbi),
        ],
        asset.chainId,
      );
    } catch (e) {
      if (
        e.message.indexOf('execution reverted') < 0 &&
        e.message.indexOf('VM execution error') < 0 &&
        e.message.indexOf("Returned values aren't valid") < 0
      ) {
        throw e;
      }
      this.logger.warn(
        `could not fetch token data, error: [${e.message}], analysis will be skipped`,
      );
    }
  }
}
