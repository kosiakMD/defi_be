import { Job, Queue } from 'bull';
import { AbiItem } from 'web3-utils';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId } from '@app/common';
import { chunkRunAsync, formatAddress, isZeroAddress } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UNIV2_FACTORY_ABI } from '../../../common/abis/univ2-factory.abi';
import { AssetJobName } from '../../../common/enum/job-name.enum';
import { JobPriority } from '../../../common/enum/job-priority.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { AssetReference } from '../../../common/types';
import { Univ2NetworkPriceProviderConfig } from '../../../common/types/';

import { PriceSourceStrategy } from '../../prices/enums/price-source-strategy.enum';
import { PriceSourceRepository } from '../../prices/repositories/price-source.repository';
import { PriceSource } from '../../prices/types/price-source.type';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { findAbiItem } from '../utils/abi';
import { getAssetProcessJobId } from '../utils/jobs.helper';
import { areStringEqualsIgnoreCase } from '../utils/strings';

/*
 Tries to find all LP pairs needed for UNIV2 network price calculation strategy
 Should be executed daily.
* */
@Processor(QueueName.ASSETS)
export class Univ2LikeAssetsLPProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
    private readonly assetsRepository: AssetsCachedRepository,
    private readonly multicall: MulticallAggregator,
  ) {}

  @Process(AssetJobName.UPDATE_UNIV2_LIKE_ASSETS_LP)
  async handle(job: Job<PriceSource>) {
    try {
      const priceSources = await this.priceSourceRepository.getPriceSourceByType(
        PriceSourceStrategy.UNIV2_NETWORK,
      );
      this.logger.log(`${priceSources.length} UniSwap V2 sources found`);

      for (const source of priceSources) {
        const lpTokens = await this.getLpTokensForSource(
          source.config as Univ2NetworkPriceProviderConfig,
        );
        const promises = lpTokens.map(this.processAsset.bind(this));
        await Promise.all(promises);
      }
    } catch (e) {
      this.logger.error(`Error updating UniSwap V2 like LPs: ${job.name}`, e);
      throw e;
    }
  }

  private async getLpTokensForSource(
    config: Univ2NetworkPriceProviderConfig,
  ): Promise<AssetReference[]> {
    const { chainId, factory, wrappedCoin, stableCoins, proxyCoins } = config;

    const baseAssets = [...[wrappedCoin], ...stableCoins, ...(proxyCoins || [])].map(formatAddress);
    const trackedAssets = await this.assetsRepository.findTrackedAssetsByChain(chainId);

    const pairs = new Array<Pair>();
    for (const baseAsset of baseAssets) {
      for (const { address } of trackedAssets) {
        if (!areStringEqualsIgnoreCase(baseAsset, address)) {
          pairs.push({ token0: baseAsset, token1: address });
        }
      }
    }

    const savedPairs = await this.assetsRepository.findUniV2LikePairsForTrackedAssets(
      chainId,
      formatAddress(factory),
      baseAssets,
    );

    const unknownPairs = this.getUnknownPairs(pairs, savedPairs);
    if (!unknownPairs.length) {
      return [];
    }

    this.logger.log(
      `Trying to find ${unknownPairs.length} unknown UniV2 pairs. Factory: ${factory}`,
    );
    const foundPairs = await this.getTokensForPairs(chainId, factory, unknownPairs);
    this.logger.log(`Found ${foundPairs.length} new UniV2 pairs. Factory: ${factory}`);
    return foundPairs;
  }

  async getTokensForPairs(
    chainId: ChainId,
    factory: Address,
    pairs: Pair[],
  ): Promise<AssetReference[]> {
    const factoryContract = new DynamicContract(factory);
    const getPairAbi: AbiItem = findAbiItem(UNIV2_FACTORY_ABI, 'getPair');

    const calls = pairs.map(({ token0, token1 }) =>
      factoryContract.createCall(getPairAbi, token0, token1),
    );

    const responses: Address[] = await chunkRunAsync(calls, 1000, (chunk) =>
      this.multicall.callArray(chunk, chainId),
    );

    return responses
      .filter((address) => !isZeroAddress(address))
      .map((address) => ({
        chainId,
        address,
      }));
  }

  private getUnknownPairs(pairs: Pair[], knownPairs: Pair[]) {
    const key = (token0: Address, token1: Address) => `${token0}_${token1}`;

    const knownMap = new Map<string, boolean>();
    knownPairs.forEach(({ token0, token1 }) => {
      knownMap.set(key(token0, token1), true);
      knownMap.set(key(token1, token0), true);
    });

    return pairs.filter(({ token0, token1 }) => !knownMap.get(key(token0, token1)));
  }

  private processAsset({ chainId, address }: AssetReference) {
    return this.assetsQueue.add(
      AssetJobName.ASSET_METADATA,
      {
        chainId,
        address,
      },
      {
        // NOTE: This should prevent process asset jobs duplications
        jobId: getAssetProcessJobId({ chainId, address }),
        priority: JobPriority.LOW,
      },
    );
  }
}

type Pair = {
  token0: Address;
  token1: Address;
};
