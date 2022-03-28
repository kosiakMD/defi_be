import axios from 'axios';
import BigNumber from 'bignumber.js';
import { partition } from 'lodash';

import { ChainIdEnum, CurrencyEnum, CurrencyIdEnum } from '@app/common';
import { PriceSourcePriority } from '@app/common/enum/price.enum';
import { concatStrings } from '@app/common/utils';
import { ChainCoinAddresses, getCoingeckoPlatformId } from '@app/common/utils/chains';
import { toChunkedArray } from '@app/common/utils/transform';

import { priceUpdateLimitInHour, solPublicAssetsApi } from './config';
import {
  LIMIT,
  TOTAL_LIMIT,
  CHUNK_SIZE,
  DEFAULT_LIMIT_HOURS,
  MS_IN_HOUR,
  DEBANK_CHUNK,
} from './constants/processor.constant';
import { CoingeckoRequestContracts, CoingeckoRequestIds } from './interfaces/coingecko.interface';
import { AssetsApiDto, AssetsService } from './services/assets.service';
import { CoingeckoService } from './services/coingecko.service';
import { DebankService } from './services/debank.service';
import { CurrentPriceInterface, PriceService } from './services/price.service';
import { SundaeSwapService } from './services/sundaeswap.service';
import { DebankChainsIdEnum } from './utils/debank.chains.id.enum';
import { duplicateAssetsPricesMap } from './utils/duplicate.assets.prices.map';
import { logger } from './utils/logger';

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
        Promise.allSettled(
          chainMap.map((request) =>
            request.contractAddresses
              ? CoingeckoService.simpleTokenPrice(request)
              : CoingeckoService.simplePrice(request),
          ),
        ),
      ),
    );

    // eslint-disable-next-line prefer-const
    let [chainsPrices, missedChainPricesMap] = handleCoingeckoResponse(
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

    chainsPrices = chainsPrices.concat(solPrices);

    /** Cardano SundaeSwapService Place */
    const tokensPrices = await SundaeSwapService.getTokensPrices();
    const cardanoPrices: CurrentPriceInterface[] = [];

    for (const token of tokensPrices) {
      const address = token.assetB.assetId.replace(/\./g, '');
      if (token.assetB.decimals !== null) {
        cardanoPrices.push({
          address: address,
          price: new BigNumber(token.priceUSD).toNumber(),
          chainId: ChainIdEnum.cardano,
          currencyId: CurrencyIdEnum.usd,
          sourceId: PriceSourcePriority.muesliswap,
        });
      }
    }

    chainsPrices = chainsPrices.concat(cardanoPrices);

    await PriceService.saveAssetsPrices(chainsPrices);
    logger.info(`${chainsPrices.length} prices stored`);
  } catch (e: any) {
    logger.error('Processing prices failed', e.message);
    throw e;
  }
}

function handleCoingeckoResponse(
  executedPriceRequests: PromiseSettledResult<any>[][],
  requestMap: Map<string, CoingeckoRequestContracts[] | CoingeckoRequestIds[]>,
  requestValuesArray: any[][],
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
      if (requestValuesArray[index][i].contractAddresses) {
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
      } else if (requestValuesArray[index][i].extras) {
        Object.keys(requestValuesArray[index][i].extras).forEach((k) => {
          const address = requestValuesArray[index][i].extras[k].address;
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
      }
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

function buildCoingeckoRequestsMap(
  chainAssetsMap: Map<string, AssetsApiDto[]>,
): Map<string, CoingeckoRequestContracts[] | CoingeckoRequestIds[]> {
  const testMap = new Map<string, CoingeckoRequestContracts[] | CoingeckoRequestIds[]>();
  for (const [chain, assets] of chainAssetsMap) {
    const coingeckoPlatform = getCoingeckoPlatformId(Number(chain));
    const chunks = toChunkedArray(
      assets.map((d) =>
        d.extensions.coingeckoId
          ? { address: d.address, coingeckoId: d.extensions.coingeckoId }
          : d.address,
      ),
      CHUNK_SIZE,
    );

    const mapItem = chunks.flatMap((c) => {
      const splited = partition(c, (i) => typeof i !== 'string');

      const ids = splited[0] as { address: string; coingeckoId: any }[];
      const contracts = splited[1] as string[];

      const requestItem = [];
      if (ids.length > 0) {
        requestItem.push({
          ids: ids.map((i) => i.coingeckoId).join(','),
          vsCurrencies: CurrencyEnum.usd,
          extras: Object.fromEntries(
            ids.map(({ coingeckoId, address }) => [coingeckoId, { address }]),
          ),
        });
      }

      if (contracts.length > 0) {
        requestItem.push({
          platformId: coingeckoPlatform,
          contractAddresses: contracts.join(','),
          vsCurrencies: CurrencyEnum.usd,
        });
      }
      return requestItem;
    });
    testMap.set(chain, mapItem);
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
    if (chainId) {
      if (!assetsMap.get(chainId)) {
        assetsMap.set(chainId, []);
      }
      assetsMap.get(chainId).push(a);
    }
  });
  return assetsMap;
}

function getSolanaPriceRequests() {
  const requests: string[] = [];
  // get first N assets from api
  for (let i = 0; i < TOTAL_LIMIT; i += LIMIT) {
    requests.push(
      `${solPublicAssetsApi}/token/list?sortBy=market_cap&direction=desc&limit=${LIMIT}&offset=${i}`,
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
      currentDateMs - Date.parse(currentPrice.updatedAt) > limit
    ) {
      filteredAssets.push(asset);
    }
  });
  return filteredAssets;
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
