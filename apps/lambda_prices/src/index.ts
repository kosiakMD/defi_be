import { AssetsService } from './assets.service';
import { MultiCall } from './chain/multicall/multi.call';
import { PairContract } from './chain/uniswapv2pair/pair.contract';
import { Web3Provider } from './chain/web3.provider';
import { AssetPairData, AssetsApiResponse, LambdaRequestInterface, Pair } from './interfaces';
import { LOGGER } from './logger/logger';
import { PriceService } from './price.service';
import { TokenPriceService } from './token.price.service';
import { toField } from './util';
import { zeroAddress } from './utils/constants';

async function getPairObjectV2(
  data: AssetPairData,
  stableCoinMap: Map<string, AssetsApiResponse>,
  asset: AssetsApiResponse,
): Promise<void> {
  try {
    if (data.pairAddress === zeroAddress) return;
    const stable = stableCoinMap.get(data.coin);
    const pair: Pair = {
      address: data.pairAddress,
      type: data.protocolName,
      tokens: [
        { tokenAddress: data.coin, decimals: stable.decimals },
        { tokenAddress: data.asset, decimals: asset.decimals },
      ],
    };
    const contract = new PairContract(Web3Provider.getWeb3(), pair.address);
    const token0Address: string = await contract.token0();
    pair.tokens[0].pairPosition = data.coin === token0Address.toLowerCase() ? 0 : 1;
    pair.tokens[1].pairPosition = data.asset === token0Address.toLowerCase() ? 0 : 1;

    !asset?.pairs?.length ? (asset['pairs'] = [pair]) : asset.pairs.push(pair);
  } catch (e) {
    LOGGER.info(e.message);
    return;
  }
}

function getAssetPairsArguments(
  requestParams: LambdaRequestInterface,
  asset: AssetsApiResponse,
  stableCoinMap: Map<string, AssetsApiResponse>,
) {
  const pairs: AssetPairData[] = [];
  requestParams.protocol.forEach((prot) => {
    if (asset.address !== requestParams.wrappedCoin && stableCoinMap.get(asset.address)) {
      const value: AssetPairData = {
        coin: requestParams.wrappedCoin,
        asset: asset.address,
        factory: prot.address,
        protocolName: prot.name,
      };
      pairs.push(value);
    }

    stableCoinMap.forEach((stableCoin) => {
      if (asset.address !== stableCoin.address) {
        const value: AssetPairData = {
          coin: stableCoin.address,
          asset: asset.address,
          factory: prot.address,
          protocolName: prot.name,
        };
        pairs.push(value);
      }
    });
  });

  return pairs;
}

async function addPairsDataToAssetsV2(
  requestParams: LambdaRequestInterface,
  assetsWithNewData: AssetsApiResponse[],
  stableAssetsMap: Map<string, AssetsApiResponse>,
  assetsPairDataMap: Map<string, AssetPairData[]>,
  assetsMap: Map<string, AssetsApiResponse>,
): Promise<void> {
  const keysArray = [...assetsPairDataMap.keys()];
  const chunkSize = 100;
  for (let i = 0, j = keysArray.length; i < j; i += chunkSize) {
    const to = toField(i, keysArray.length, chunkSize);
    const sliceAssets = keysArray.slice(i, to);
    await Promise.all(
      sliceAssets.map(async (asset) => {
        const pairData = assetsPairDataMap.get(asset);
        const apiAsset = assetsMap.get(asset);
        await Promise.all(
          pairData.map(async (data) => {
            await getPairObjectV2(data, stableAssetsMap, apiAsset);
          }),
        );
        if (!apiAsset?.pairs) apiAsset.pairs = [];
        assetsWithNewData.push(apiAsset);
      }),
    );
  }
}

function findPairsDataToAssets(
  assets: AssetsApiResponse[],
  requestParams: LambdaRequestInterface,
  stableAssetsMap: Map<string, AssetsApiResponse>,
) {
  const pairsArgs: AssetPairData[] = [];
  assets.forEach((asset) => {
    if (!asset?.pairs) {
      pairsArgs.push(...getAssetPairsArguments(requestParams, asset, stableAssetsMap));
    }
  });
  return pairsArgs;
}

function addUniquePairAddresses(assets: AssetsApiResponse[], uniquePairAddresses: Set<string>) {
  assets.forEach((asset) => {
    asset.pairs?.forEach((pair) => uniquePairAddresses.add(pair.address));
  });
}

export async function getResult(requestParams: LambdaRequestInterface): Promise<void> {
  try {
    Web3Provider.initWeb3(requestParams.rpcUrl);
    const assets = await AssetsService.getAssetsAndPairsFromDbByChain(
      requestParams.tokenServiceUrl,
      requestParams.chainId,
    );
    if (!assets.length) {
      return;
    }
    const assetsMap = new Map<string, AssetsApiResponse>();
    assets.forEach((asset) => assetsMap.set(asset.address, asset));

    const uniquePairAddresses = new Set<string>();
    const stableCoinsMap = new Map<string, AssetsApiResponse>();
    requestParams.stableCoins.push(requestParams.wrappedCoin);
    assets.forEach((asset) => {
      if (
        [...requestParams.stableCoins, ...requestParams.whiteListCoins].find(
          (address) => address === asset.address,
        )
      ) {
        stableCoinsMap.set(asset.address, asset);
      }
    });
    const assetsWithNewData: AssetsApiResponse[] = [];
    const assetsArgs = findPairsDataToAssets(assets, requestParams, stableCoinsMap);
    const multiCall = new MultiCall();
    const assetsPairDataMap = await multiCall.getAssetsPairs(
      assetsArgs,
      requestParams.contractAddress,
    );

    await addPairsDataToAssetsV2(
      requestParams,
      assetsWithNewData,
      stableCoinsMap,
      assetsPairDataMap,
      assetsMap,
    );

    addUniquePairAddresses(assets, uniquePairAddresses);
    const prices = await PriceService.getTokensPrices(requestParams.priceServiceUrl, requestParams);

    const reserves = await multiCall.getPairsReserves(
      Array.from(uniquePairAddresses),
      requestParams.contractAddress,
    );

    const assetsPrices = TokenPriceService.getTokensPriceResponse(
      requestParams,
      reserves,
      assets,
      prices.prices,
      stableCoinsMap,
    );
    const priceResponses = assetsPrices.filter((asset) => asset);
    await AssetsService.saveAssetsPairs(requestParams.tokenServiceUrl, assetsWithNewData);
    LOGGER.info(JSON.stringify(priceResponses));
    await PriceService.saveAssetsPrices(requestParams.priceServiceUrl, assetsPrices);
  } catch (e) {
    LOGGER.error(e.message);
    throw e;
  }
}
