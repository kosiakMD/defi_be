import BigNumber from 'bignumber.js';

import {
  PairTokens,
  UniswapMulticallService,
} from './chain/uniswap-multicall/uniswap-multicall.service';
import { web3 } from './chain/web3';
import {
  baseTokens,
  chainId,
  currencyId,
  minLiquidityRequired,
  multicallContractAddress,
  poolsBatchSize,
  protocols,
  stableCoins,
} from './config';
import { AssetsApiDto, AssetsService } from './services/assets.service';
import { PriceService } from './services/price.service';
import { normalizeDecimals } from './utils';
import { blacklisted } from './utils/blacklisted';
import { logger } from './utils/logger';

export async function process(): Promise<void> {
  try {
    logger.info(`Starting job. Chain id: ${chainId}. Currency Id: ${currencyId}`);

    const assets = await AssetsService.getAssetsAndPairsByChain(chainId);
    if (!assets.length) {
      logger.warn('No assets found');
      return;
    }

    logger.info(`Assets loaded. ${assets.length} assets found`);

    const pairsMap = buildPairsMap(assets);
    const assetsMap = buildAssetsMap(assets);
    const stableTokensMap = buildStableTokensMap(assetsMap);
    const pricesMap = await buildPricesMap();

    const missingAssets: string[] = [];

    for (const protocol of protocols) {
      logger.info(`Checking protocol ${protocol.name}`);

      const uniswapMulticall = new UniswapMulticallService(web3, multicallContractAddress);
      const total = await uniswapMulticall.allPairsLength(protocol.address);
      const batchSize = poolsBatchSize;

      for (let from = 0; from < total; from += batchSize) {
        try {
          const fixedBatchSize = Math.min(batchSize, total - from);
          logger.info(
            `Checking pair from ${from} to ${from + fixedBatchSize} of ${total}. (new: ${
              missingAssets.length
            })`,
          );

          const pairIds = Array.from(Array(fixedBatchSize - 1).keys()).map((key) => from + key);
          const pairAddresses = await uniswapMulticall.getPairs(protocol.address, pairIds);

          let pairsTokens = await uniswapMulticall.getTokensForPairs(pairAddresses);

          // TODO: This one is temporary solution, we should keep it in database
          if (containsBlacklistedToken(pairsTokens)) {
            continue;
          }

          pairsTokens = filterKnownTokenPairs(pairsTokens, pairsMap);

          const pairs = await getPairsDetails(uniswapMulticall, pairsTokens);

          for (const pair of pairs) {
            let stableToken;
            let stableReserved;

            let token;
            let tokenReserve;

            let decimals;

            const {
              token0: { address: token0, reserve: reserve0 },
              token1: { address: token1, reserve: reserve1 },
            } = pair;

            if (stableCoins.includes(token0)) {
              token = token1;
              tokenReserve = reserve1;
              decimals = pair.token1.decimals;

              stableToken = token0;
              stableReserved = reserve0;
            } else {
              token = token0;
              tokenReserve = reserve0;
              decimals = pair.token0.decimals;

              stableToken = token1;
              stableReserved = reserve1;
            }

            if (assetsMap.get(token)) {
              logger.info(`Token ${token} is already in database`);
              continue;
            }

            const tokenAmount = normalizeDecimals(tokenReserve.toString(), decimals);
            const stableTokenAmount = normalizeDecimals(
              stableReserved.toString(),
              stableTokensMap.get(stableToken).decimals,
            );
            const stableTokenLiquidity = stableTokenAmount.times(pricesMap.get(stableToken));
            const poolLiquidity = stableTokenLiquidity.times(2);

            if (poolLiquidity.lt(minLiquidityRequired)) {
              logger.info(`Token ${token} liquidity is too small ${stableTokenAmount}`);
              continue;
            }

            const price = tokenAmount.div(stableTokenLiquidity);

            if (!missingAssets.includes(token)) {
              missingAssets.push(token);
            }

            try {
              await AssetsService.saveAssets({
                chain: chainId,
                address: token,
              });

              logger.info(
                `NEW Token ${token} price: ${price.valueOf()}. Liquidity ${poolLiquidity.valueOf()}`,
              );
            } catch (e) {
              logger.error(`Error saving token ${token}`, e);
            }
          }
        } catch (e) {
          logger.error(`Error checking pairs from ${from} to ${from + batchSize - 1}`, e);
        }
      }
    }

    logger.info(`New tokens found: ${missingAssets}`);
    logger.info(`Done. ${missingAssets.length} tokens found`);
  } catch (e) {
    logger.error('Processing prices failed', e);
    throw e;
  }
}

function filterKnownTokenPairs(pairs: PairTokens[], pairsMap: Map<string, string>) {
  const results: PairTokens[] = [];

  for (const pair of pairs) {
    const pairAddress = pair.address.toLowerCase();
    const token0 = pair.token0.toLowerCase();
    const token1 = pair.token1.toLowerCase();

    if (pairsMap.get(pairAddress)) {
      logger.info(`Pair ${pairAddress} already exists, skipping`);
      continue;
    }

    if (stableCoins.includes(token0) && stableCoins.includes(token1)) {
      logger.info(`Both coins ${token0}, ${token1} are stable, skipping`);
      continue;
    }

    if (!stableCoins.includes(token0) && !stableCoins.includes(token1)) {
      logger.info(`Both coins ${token0}, ${token1} are NOT stable, skipping`);
      continue;
    }

    results.push(pair);
  }

  return results;
}

async function getPairsDetails(
  multicall: UniswapMulticallService,
  pairsTokens: PairTokens[],
): Promise<Pair[]> {
  const pairAddresses = pairsTokens.map(({ address }) => address);

  const [reserves, tokens0Decimals, tokens1Decimals] = await Promise.all([
    multicall.getPairReserves(pairAddresses),
    multicall.getTokenDecimals(Object.values(pairsTokens).map(({ token0 }) => token0)),
    multicall.getTokenDecimals(Object.values(pairsTokens).map(({ token1 }) => token1)),
  ]);

  return pairsTokens.map((pair) => {
    const { token0, token1 } = pair;

    return {
      address: pair.address.toLowerCase(),
      token0: {
        address: token0.toLowerCase(),
        decimals: tokens0Decimals[token0],
        reserve: reserves[pair.address].reserve0,
      },
      token1: {
        address: token1.toLowerCase(),
        decimals: tokens1Decimals[token1],
        reserve: reserves[pair.address].reserve1,
      },
    };
  });
}

function buildPairsMap(assets: AssetsApiDto[]) {
  return assets.reduce((map, { address, pairs }) => {
    pairs?.forEach((pair) => map.set(pair.address, address));
    return map;
  }, new Map<string, string>());
}

function buildAssetsMap(assets: AssetsApiDto[]) {
  return assets.reduce((map, dto) => map.set(dto.address, dto), new Map<string, AssetsApiDto>());
}

function buildStableTokensMap(assetsMap: Map<string, AssetsApiDto>) {
  return stableCoins.reduce(
    (map, stable) => map.set(stable, assetsMap.get(stable)),
    new Map<string, AssetsApiDto>(),
  );
}

async function buildPricesMap() {
  const pricesMap = stableCoins.reduce(
    // NOTE: We assume stable token prices is close to 1
    (map, stable) => map.set(stable, 1),
    new Map<string, number>(),
  );

  if (baseTokens.length) {
    const { prices } = await PriceService.fetchPrices({
      chainId,
      currencyId: 1,
      addresses: baseTokens,
    });

    for (const token in prices) {
      if (prices[token]) {
        pricesMap.set(token, Number(prices[token]));
      }
    }
  }
  return pricesMap;
}

function containsBlacklistedToken(pairsTokens: PairTokens[]) {
  return pairsTokens.some(
    ({ token1, token0 }) =>
      blacklisted.includes(token0.toLowerCase()) || blacklisted.includes(token1.toLowerCase()),
  );
}

export type PairToken = {
  address: string;
  decimals: number;
  reserve: BigNumber;
};

export type Pair = {
  address: string;
  token0: PairToken;
  token1: PairToken;
};
