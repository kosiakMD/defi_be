import { ChainIdEnum, CurrencyEnum, CurrencyIdEnum } from '@app/common';
import { PriceSourcePriority } from '@app/common/enum/price.enum';
import { concatStrings } from '@app/common/utils';
import {
  ChainCoinAddresses,
  CoingeckoCoinIds,
  getCoingeckoPlatformId,
} from '@app/common/utils/chains';
import { toChunkedArray } from '@app/common/utils/transform';

import { priceUpdateLimitInHour } from './config';
import { AssetsApiDto, AssetsService } from './services/assets.service';
import { CoingeckoRequest, CoingeckoService } from './services/coingecko.service';
import { CurrentPriceInterface, PriceService } from './services/price.service';
import { logger } from './utils/logger';

const CHUNK_SIZE = 175;
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

    const requestMap = buildCoingeckoRequestsMap(chainAssetsMap);

    const executedPriceRequests = await Promise.allSettled(
      [...requestMap.values()].map((chainMap) =>
        Promise.allSettled(chainMap.map((request) => CoingeckoService.simpleTokenPrice(request))),
      ),
    );

    const chainsPrices: CurrentPriceInterface[] = [];
    let index = 0;
    for (const key of requestMap.keys()) {
      // in this case status will always be fulfilled, check is not required
      const { value } = executedPriceRequests[index] as PromiseFulfilledResult<any>;
      value?.forEach((chainResp) => {
        if (chainResp.status === 'rejected') {
          logger.warn(
            `Status of price request is "rejected" for chain ${key}, message: ${chainResp.reason.message}`,
          );
          return;
        }
        const pricesToPriceService: CurrentPriceInterface[] = Object.keys(chainResp.value).map(
          (address) => {
            return {
              address: address,
              price: chainResp.value[address].usd,
              chainId: Number(key),
              currencyId: CurrencyIdEnum.usd,
              sourceId: PriceSourcePriority.coingecko,
            };
          },
        );

        chainsPrices.push(...pricesToPriceService);
      });
      index++;
    }

    // only solana:
    const executedNativeCoinsRequests = await CoingeckoService.simplePrice({
      ids: CoingeckoCoinIds[ChainIdEnum.sol],
      vsCurrencies: CurrencyEnum.usd,
    });
    chainsPrices.push({
      address: ChainCoinAddresses[ChainIdEnum.sol],
      price: executedNativeCoinsRequests[CoingeckoCoinIds[ChainIdEnum.sol]].usd,
      chainId: ChainIdEnum.sol,
      currencyId: CurrencyIdEnum.usd,
      sourceId: PriceSourcePriority.coingecko,
    });

    await PriceService.saveAssetsPrices(chainsPrices);

    logger.info(`${chainsPrices.length} prices stored`);
  } catch (e) {
    logger.error('Processing prices failed', e.message);
    throw e;
  }
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

function getAssetsPerChainMap(assets: AssetsApiDto[]): Map<string, AssetsApiDto[]> {
  const assetsMap: Map<string, AssetsApiDto[]> = new Map<string, AssetsApiDto[]>();
  assets.forEach((a) => {
    const chainId = a.chain.toString();
    if (!assetsMap.get(chainId)) {
      assetsMap.set(chainId, []);
    }
    assetsMap.get(chainId).push(a);
  });
  return assetsMap;
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
