import axios from 'axios';

import { ChainIdEnum, CurrencyEnum, CurrencyIdEnum } from '@app/common';
import { PriceSourcePriority } from '@app/common/enum/price.enum';
import { concatStrings } from '@app/common/utils';
import { ChainCoinAddresses, getCoingeckoPlatformId } from '@app/common/utils/chains';
import { toChunkedArray } from '@app/common/utils/transform';

import { priceUpdateLimitInHour, solPublicAssetsApi } from './config';
import { AssetsApiDto, AssetsService } from './services/assets.service';
import { CoingeckoRequest, CoingeckoService } from './services/coingecko.service';
import { DebankService } from './services/debank.service';
import { CurrentPriceInterface, PriceService } from './services/price.service';
import { DebankChainsIdEnum } from './utils/debank.chains.id.enum';
import { duplicateAssetsPricesMap } from './utils/duplicate.assets.prices.map';
import { logger } from './utils/logger';

const CHUNK_SIZE = 175;
const DEBANK_CHUNK = 50;
const DEFAULT_LIMIT_HOURS = 24;
const MS_IN_HOUR = 1000 * 60 * 60;

export async function process(): Promise<void> {
  try {
    logger.info(`External prices job started`);
    const allAssets = await AssetsService.getAllAssets();
    logger.info(`Assets total ${allAssets.length} assets from asset service`);
    const allCurrentPricesMap = new Map(
      (await PriceService.getAllAssetsPrices()).map((obj) => [
        concatStrings(obj.address, obj.chainId),
        obj,
      ]),
    );

    const filteredAssets = getFilterDbAssets(allAssets, allCurrentPricesMap);

    const chainAssetsMap = await getAssetsPerChainMap(filteredAssets);
    // TODO: Why do we do this?
    // remove Solana assets
    chainAssetsMap.delete(ChainIdEnum.sol.toString());

    const requestMap = buildCoingeckoRequestsMap(chainAssetsMap);
    const requestValuesArray = Array.from(requestMap.values());
    const executedPriceRequests = await Promise.all(
      requestValuesArray.map((chainMap) =>
        Promise.allSettled(chainMap.map((request) => CoingeckoService.simpleTokenPrice(request))),
      ),
    );

    const [chainsPrices, missedChainPricesMap] = handleCoingeckoResponse(
      executedPriceRequests,
      requestMap,
      requestValuesArray,
    );

    const debankRequestIdsMap = getDebankRequestsIdsMap(missedChainPricesMap);
    const debankResponse = await Promise.all(
      [...debankRequestIdsMap.values()].map((chainMap) =>
        Promise.allSettled(chainMap.map((request) => DebankService.getTokensPrices(request))),
      ),
    );

    chainsPrices.push(...handleDebankResponse(debankResponse));

    // TODO: This is temporary solution. This code should not be here
    // Only Solana
    const solPriceRequests = getSolanaPriceRequests();
    const executedSolPriceRequests = await Promise.allSettled(
      solPriceRequests.map((url) => {
        return axios.get(url);
      }),
    );
    const solPrices: CurrentPriceInterface[] = [];
    executedSolPriceRequests.forEach((result) => {
      if (result.status !== 'rejected') {
        result.value.data.data.forEach((asset) => {
          if (asset.priceUst && (!asset.tag || (asset.tag && !asset.tag.includes('lp-token')))) {
            solPrices.push({
              address:
                asset.mintAddress === 'So11111111111111111111111111111111111111112'
                  ? ChainCoinAddresses[ChainIdEnum.sol]
                  : asset.mintAddress,
              price: asset.priceUst,
              chainId: ChainIdEnum.sol,
              currencyId: CurrencyIdEnum.usd,
              sourceId: PriceSourcePriority.coingecko,
            });
          }
        });
      }
    });

    chainsPrices.push(...solPrices);

    await PriceService.saveAssetsPrices(chainsPrices);
    logger.info(`${chainsPrices.length} prices stored`);
  } catch (e) {
    logger.error('Processing prices failed', e.message);
    throw e;
  }
}

function handleCoingeckoResponse(
  executedPriceRequests: PromiseSettledResult<any>[][],
  requestMap: Map<string, CoingeckoRequest[]>,
  requestValuesArray: CoingeckoRequest[][],
): [CurrentPriceInterface[], Map<string, string[]>] {
  const chainsPrices = [];
  let index = 0;
  const missedChainPricesMap = new Map<string, string[]>();
  for (const key of requestMap.keys()) {
    const value = executedPriceRequests[index];
    value?.forEach((chainResp, i) => {
      if (chainResp.status === 'rejected') {
        logger.warn(
          `Status of price request is "rejected" for chain ${key}, message: ${chainResp.reason.message}`,
        );
        return;
      }
      const addresses = requestValuesArray[index][i].contractAddresses.split(',');
      addresses.forEach((address) => {
        const price = chainResp.value[address]?.usd;
        if (price === undefined || price === null) {
          const chainAssets = missedChainPricesMap.get(key);
          chainAssets ? chainAssets.push(address) : missedChainPricesMap.set(key, [address]);
        } else {
          chainsPrices.push(...handleDuplicatePriceAssets(address, price));
          chainsPrices.push({
            address: address,
            price: price,
            chainId: Number(key),
            currencyId: CurrencyIdEnum.usd,
            sourceId: PriceSourcePriority.coingecko,
          });
        }
      });
    });
    index++;
  }
  return [chainsPrices, missedChainPricesMap];
}

function handleDuplicatePriceAssets(address: string, price: number) {
  const duplicateAssets = duplicateAssetsPricesMap.get(address);
  if (duplicateAssets) {
    return duplicateAssets.map((asset) => ({
      address: asset.address,
      price: price,
      chainId: asset.chain,
      currencyId: CurrencyIdEnum.usd,
      sourceId: PriceSourcePriority.coingecko,
    }));
  }
  return [];
}

function handleDebankResponse(debankResponse: PromiseSettledResult<any>[][]) {
  const chainsPrices = [];
  debankResponse.forEach((value) => {
    value.forEach((resp) => {
      if (resp.status === 'rejected') {
        logger.warn(
          `Status of price request is "rejected" for debank api, message: ${resp.reason.message}`,
        );
        return;
      }
      resp.value.forEach((token) => {
        if (token.price) {
          chainsPrices.push(...handleDuplicatePriceAssets(token.id, token.price));
          chainsPrices.push({
            address: token.id,
            price: token.price,
            chainId: Number(DebankChainsIdEnum[token.chain]),
            currencyId: CurrencyIdEnum.usd,
            sourceId: PriceSourcePriority.coingecko,
          });
        }
      });
    });
  });
  return chainsPrices;
}

function buildCoingeckoRequestsMap(
  chainAssetsMap: Map<string, AssetsApiDto[]>,
): Map<string, CoingeckoRequest[]> {
  const testMap = new Map<string, CoingeckoRequest[]>();
  for (const [chain, assets] of chainAssetsMap) {
    const coingeckoPlatform = getCoingeckoPlatformId(Number(chain));
    const chunks = toChunkedArray(
      assets.map((a) => a.address),
      CHUNK_SIZE,
    );
    chunks.forEach((c) => {
      const requestItem = {
        platformId: coingeckoPlatform,
        contractAddresses: c.join(','),
        vsCurrencies: CurrencyEnum.usd,
      };

      const mapItem = testMap.get(chain);
      mapItem ? mapItem.push(requestItem) : testMap.set(chain, [requestItem]);
    });
  }
  return testMap;
}

function getDebankRequestsIdsMap(chainAssetsMap: Map<string, string[]>): Map<string, string[]> {
  const requestMap = new Map<string, string[]>();
  for (const [chain, assets] of chainAssetsMap) {
    const chunks = toChunkedArray(assets, DEBANK_CHUNK);
    chunks.forEach((c) => {
      const chainAbbr = DebankChainsIdEnum[chain];
      if (!chainAbbr) {
        return;
      }
      const ids = c.join(',');
      const requestStr = `chain_id=${chainAbbr}&ids=${ids}`;
      const mapItem = requestMap.get(chain);
      mapItem ? mapItem.push(requestStr) : requestMap.set(chain, [requestStr]);
    });
  }
  return requestMap;
}

function getAssetsPerChainMap(assets: AssetsApiDto[]): Map<string, AssetsApiDto[]> {
  const assetsMap: Map<string, AssetsApiDto[]> = new Map<string, AssetsApiDto[]>();
  assets.forEach((a) => {
    const chainId = a.chain?.toString();
    if (chainId && !assetsMap.get(chainId)) {
      assetsMap.set(chainId, []);
    }
    assetsMap.get(chainId).push(a);
  });
  return assetsMap;
}

function getSolanaPriceRequests() {
  const requests: string[] = [];
  const limit = 50;
  const totalLimit = 600;
  // get first N assets from api
  for (let i = 0; i < totalLimit; i += limit) {
    requests.push(
      `${solPublicAssetsApi}/token/list?sortBy=market_cap&direction=desc&limit=${limit}&offset=${i}`,
    );
  }
  return requests;
}

function getFilterDbAssets(
  assets: AssetsApiDto[],
  currentPricesMap: Map<string, CurrentPriceInterface>,
) {
  const filteredAssets = [];
  const hours = priceUpdateLimitInHour ? Number(priceUpdateLimitInHour) : DEFAULT_LIMIT_HOURS;
  const limit = MS_IN_HOUR * hours;
  const currentDateMs = Date.now();
  assets.map((asset) => {
    const currentPrice = currentPricesMap.get(concatStrings(asset.address, asset.chain));
    if (
      !currentPrice ||
      currentPrice.sourceId >= PriceSourcePriority.coingecko ||
      currentDateMs - Date.parse(currentPrice.updatedAt) > limit ||
      duplicateAssetsPricesMap.get(asset.address)
    ) {
      filteredAssets.push(asset);
    }
  });
  return filteredAssets;
}
