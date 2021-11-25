import { ChainIdEnum, CurrencyEnum, CurrencyIdEnum } from '@app/common';
import { ChainCoinAddresses, CoingeckoCoinIds, getCoingeckoPlatformId, } from '@app/common/utils/chains';
import { toChunkedArray } from '@app/common/utils/transform';

import { AssetsApiDto, AssetsService } from './services/assets.service';
import { CoingeckoService } from './services/coingecko.service';
import { PriceDto, PriceService } from './services/price.service';
import { logger } from './utils/logger';

const CHUNK_SIZE = 175;

export async function process(): Promise<void> {
  try {
    logger.info(`External prices job started`);
    const allAssets: AssetsApiDto[] = await AssetsService.getAllAssets();
    logger.info(`Assets total ${allAssets.length} assets from asset service`);

    const chainAssets: Map<string, AssetsApiDto[]> = await getAssetsPerChainMap(allAssets);
    chainAssets.forEach((v, k) => {
      logger.info(`Found ${v.length} assets for chain ${k}`);
    });

    const [requestIndexChain, chainRequests] = getAssetsPerChainRequests(chainAssets);
    const executedPriceRequests = await Promise.allSettled(
      chainRequests.map((cr) => CoingeckoService.simpleTokenPrice(cr)),
    );

    const chainsPrices: PriceDto[] = [];
    for (const [k, res] of Object.entries(executedPriceRequests)) {
      // this is how i get chain id
      const chainIdCurrent = Number(requestIndexChain.get(k));
      if (res.status === 'rejected') {
        logger.warn(
          `Status of price request is "rejected" for chain ${chainIdCurrent}, message: ${res.reason.message}`,
        );
        continue;
      }

      const pricesToPriceService: PriceDto[] = Object.keys(res.value).map((address) => {
        return {
          address: address,
          price: res.value[address].usd,
          chainId: chainIdCurrent,
          currencyId: CurrencyIdEnum.usd,
        };
      });

      chainsPrices.push(...pricesToPriceService);
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
    });
    await PriceService.saveAssetsPrices(chainsPrices);

    logger.info(`${chainsPrices.length} prices stored`);
  } catch (e) {
    logger.error('Processing prices failed', e.message);
    throw e;
  }
}

function getAssetsPerChainRequests(
  chainAssets: Map<string, AssetsApiDto[]>,
): [Map<string, string>, Array<any>] {
  const indexChain = new Map<string, string>();
  const coingeckoRequests = Array<any>();
  let requestIndex = 0;
  for (const [chain, assets] of chainAssets) {
    const coingeckoPlatform = getCoingeckoPlatformId(Number(chain));
    if (coingeckoPlatform && Number(chain) === ChainIdEnum.sol) {
      const chunks = toChunkedArray(
        assets.map((a) => a.address),
        CHUNK_SIZE,
      );
      chunks.forEach((c) => {
        coingeckoRequests[requestIndex] = {
          platformId: coingeckoPlatform,
          // eslint-disable-next-line camelcase
          contractAddresses: c.join(','),
          // eslint-disable-next-line camelcase
          vsCurrencies: CurrencyEnum.usd,
        };
        indexChain.set(requestIndex.toString(), chain);
        requestIndex++;
      });
    }
  }
  return [indexChain, coingeckoRequests];
}

function getAssetsPerChainMap(assets: AssetsApiDto[]): Map<string, AssetsApiDto[]> {
  const assetsMap: Map<string, AssetsApiDto[]> = new Map<string, AssetsApiDto[]>();
  assets.forEach((a) => {
    if (!assetsMap.get(a.chain.toString())) {
      assetsMap.set(a.chain.toString(), []);
    }
    assetsMap.get(a.chain.toString()).push(a);
  });
  return assetsMap;
}
