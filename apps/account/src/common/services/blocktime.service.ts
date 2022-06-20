import Web3 from 'web3';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId, Logger } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';
import { retry } from '@app/common/utils';

import { Web3Provider } from '../providers/chainRelated/web3.provider';

export interface BlockTimestamp {
  date: Date;
  block: number;
  timestamp: number;
}

@Injectable()
export class BlocktimeService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly cache: CacheService,
    private readonly web3Provider: Web3Provider,
  ) {}

  public async getChainBlocksAtDate(
    chains: number[],
    date: Date,
  ): Promise<Map<number, BlockTimestamp>> {
    const blockMap = new Map<number, BlockTimestamp>();

    await Promise.all(
      chains.map(async (chain) => {
        const block = await this.getBlockAtDate(chain, date);
        blockMap.set(chain, block);
      }),
    );

    return blockMap;
  }

  public async getBlockAtDate(chain: ChainId, date: Date) {
    const cacheTTL = 65 * 60; // 1 hour 5 minutes to ensure a little overlap (block is rounded to the nearest hour)
    const cacheKey = `24hour_ago_block_${chain}_${date.getTime()}`;

    return this.cache.getOrLoad(
      cacheKey,
      async () => {
        try {
          return await this.getBlockFromDate(chain, date);
        } catch (e) {
          this.logger.error(
            `Failed to find historic block for chain ${chain}. Is the RPC an archive node?`,
          );
          this.logger.error(e);
        }
      },
      {
        ttl: cacheTTL,
      },
    );
  }

  private async getBlockFromDate(chain: ChainId, target: Date): Promise<BlockTimestamp> {
    const web3 = await this.web3Provider.getInstanceByChainId(chain);
    const latestBlock = await retry(() => web3.eth.getBlock('latest'));
    // skip the first 3/4 of blocks for performance,
    // we only need past 24 hours & old blocks can have wildly different block times than recent blocks
    const earlyBlock = await retry(() => web3.eth.getBlock(Math.floor(latestBlock.number * 0.75)));
    const avgBlockTime =
      (Number(latestBlock.timestamp) - Number(earlyBlock.timestamp)) /
      (latestBlock.number - earlyBlock.number);

    const secondsInADay = 86400;
    const secondsIn15Minutes = 900;
    const guessedBlocksIn24Hours = Math.floor(secondsInADay / avgBlockTime);

    return this.estimateBlockTimes(
      latestBlock.number - guessedBlocksIn24Hours,
      target,
      avgBlockTime,
      secondsIn15Minutes,
      web3,
    );
  }

  private async estimateBlockTimes(
    guess: number,
    target: Date,
    avgBlockTime: number,
    tolerance: number,
    web3: Web3,
  ): Promise<BlockTimestamp> {
    const guessedBlock = await retry(() => web3.eth.getBlock(guess));
    const guessedTime = new Date(Number(guessedBlock.timestamp) * 1000);
    const difference = Math.floor((guessedTime.getTime() - target.getTime()) / 1000); // difference in seconds
    if (Math.abs(difference) < tolerance) {
      return {
        date: guessedTime,
        block: guessedBlock.number,
        timestamp: (guessedTime.getTime() / 1000) >> 0,
      };
    }

    return this.estimateBlockTimes(
      guessedBlock.number - Math.floor(difference / avgBlockTime),
      target,
      avgBlockTime,
      tolerance,
      web3,
    );
  }
}
