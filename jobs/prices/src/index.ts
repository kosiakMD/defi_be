import { AssetsService } from './assets.service';
import { MultiCall } from './chain/multicall/multi.call';
import { FactoryContract } from './chain/uniswapv2pair/factory.contract';
import { PairContract } from './chain/uniswapv2pair/pair.contract';
import { Web3Provider } from './chain/web3.provider';
import { AssetsApiResponse, LambdaRequestInterface, Pair } from './interfaces';
import { LOGGER } from './logger/logger';
import { PriceService } from './price.service';
import { TokenPriceService } from './token.price.service';
import { toField } from './util';

async function getPairObject(
  stableCoin: string,
  asset: AssetsApiResponse,
  uniquePairAddresses: Set<string>,
  stableCoinMap: Map<string, AssetsApiResponse>,
  pairType: string,
): Promise<void> {
  try {
    const pairAddress = await FactoryContract.getPairInfo(stableCoin, asset.address);
    const pair: Pair = {
      address: pairAddress?.toLowerCase(),
      type: pairType,
      tokens: [
        { tokenAddress: stableCoin, decimals: stableCoinMap.get(stableCoin).decimals },
        { tokenAddress: asset.address, decimals: asset.decimals },
      ],
    };
    const contract = new PairContract(Web3Provider.getWeb3(), pair.address);
    const token0Address: string = await contract.token0();
    pair.tokens[0].pairPosition = stableCoin === token0Address.toLowerCase() ? 0 : 1;
    pair.tokens[1].pairPosition = asset.address === token0Address.toLowerCase() ? 0 : 1;

    uniquePairAddresses.add(pair.address);
    !asset?.pairs?.length ? (asset['pairs'] = [pair]) : asset.pairs.push(pair);
  } catch (e) {
    LOGGER.info(e.message);
    return;
  }
}

async function addPairAddressAndTokensPositions(
  requestParams: LambdaRequestInterface,
  asset: AssetsApiResponse,
  uniquePairAddresses: Set<string>,
  stableCoinMap: Map<string, AssetsApiResponse>,
): Promise<void> {
  if (asset.address !== requestParams.protocol.coin && stableCoinMap.get(asset.address)) {
    await getPairObject(
      requestParams.protocol.coin,
      asset,
      uniquePairAddresses,
      stableCoinMap,
      requestParams.protocol.name,
    );
    return;
  }

  await Promise.all(
    requestParams.stableCoins.map(async (stableCoin) => {
      if (asset.address === stableCoin) {
        return;
      }
      await getPairObject(
        stableCoin,
        asset,
        uniquePairAddresses,
        stableCoinMap,
        requestParams.protocol.name,
      );
    }),
  );
}

async function addPairsDataToAssets(
  assets: AssetsApiResponse[],
  requestParams: LambdaRequestInterface,
  uniquePairAddresses: Set<string>,
  assetsWithNewData: AssetsApiResponse[],
  stableAssetsMap: Map<string, AssetsApiResponse>,
): Promise<void> {
  const chunkSize = 100;
  for (let i = 0, j = assets.length; i < j; i += chunkSize) {
    const to = toField(i, assets.length, chunkSize);
    const sliceAssets = assets.slice(i, to);
    await Promise.all(
      sliceAssets.map(async (asset) => {
        if (!asset?.pairs) {
          await addPairAddressAndTokensPositions(
            requestParams,
            asset,
            uniquePairAddresses,
            stableAssetsMap,
          );
          if (!asset.pairs) asset.pairs = [];
          assetsWithNewData.push(asset);
        } else {
          asset.pairs.forEach((pair) => uniquePairAddresses.add(pair.address));
        }
      }),
    );
  }
}

export async function getResult(requestParams: LambdaRequestInterface): Promise<void> {
  try {
    const web3 = Web3Provider.initWeb3(requestParams.rpcUrl);
    FactoryContract.initFactoryContract(web3, requestParams.protocol.address);
    const assets = await AssetsService.getAssetsAndPairsFromDbByChain(
      requestParams.tokenServiceUrl,
      requestParams.chainId,
    );
    if (!assets.length) {
      return;
    }
    const uniquePairAddresses = new Set<string>();
    const stableCoinsMap = new Map<string, AssetsApiResponse>();
    requestParams.stableCoins.push(requestParams.protocol.coin);
    assets.forEach((asset) => {
      if (requestParams.stableCoins.find((address) => address === asset.address)) {
        stableCoinsMap.set(asset.address, asset);
      }
    });
    const assetsWithNewData: AssetsApiResponse[] = [];
    await addPairsDataToAssets(
      assets,
      requestParams,
      uniquePairAddresses,
      assetsWithNewData,
      stableCoinsMap,
    );

    await AssetsService.saveAssetsPairs(requestParams.tokenServiceUrl, assetsWithNewData);

    const multiCall = new MultiCall();

    const pairsReserves = await multiCall.getPairsReserves(Array.from(uniquePairAddresses));
    const assetsPrices = TokenPriceService.getTokensPriceResponse(
      requestParams,
      pairsReserves,
      assets,
    );
    LOGGER.info(JSON.stringify(assetsPrices));
    await PriceService.saveAssetsPrices(requestParams.priceServiceUrl, assetsPrices);
  } catch (e) {
    LOGGER.error(e.message);
    throw e;
  }
}
